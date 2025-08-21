/**
 * EventTracker Service with Guardrails
 * Provides robust event tracking with validation, PII protection, and error handling
 */

import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Event property types
interface BaseEventProperties {
  timestamp?: string;
  session_id?: string;
  page_url?: string;
  referrer?: string;
  user_agent?: string;
  [key: string]: any;
}

interface TrackedEvent {
  event_name: string;
  properties: BaseEventProperties;
  user_id?: string;
}

// Event validation rules
const EVENT_RULES: Record<string, {
  required?: string[];
  optional?: string[];
  maxProperties?: number;
}> = {
  waitlist_submit: {
    required: ['outcome', 'score'],
    optional: ['hasInvite', 'role', 'city'],
  },
  betaguard_blocked: {
    required: ['route', 'reason'],
  },
  betaguard_passed: {
    required: ['route'],
    optional: ['has_beta_access', 'public_beta_enabled'],
  },
  waitlist_at_capacity: {
    optional: ['spots_filled', 'cap'],
  },
};

// PII fields that should be hashed or removed
const PII_FIELDS = ['email', 'phone', 'ssn', 'password', 'credit_card', 'address'];

// Rate limiting configuration
const RATE_LIMIT = {
  maxEventsPerMinute: 100,
  maxEventsPerSession: 1000,
};

class EventTrackerService {
  private sessionId: string;
  private eventQueue: TrackedEvent[] = [];
  private eventCounts: Map<string, number> = new Map();
  private lastMinuteReset: number = Date.now();
  private sessionEventCount: number = 0;
  private batchTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    
    // Set up online/offline detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      window.addEventListener('beforeunload', () => this.flush());
    }
    
    // Start batch processing
    this.startBatchProcessing();
  }

  /**
   * Get or create a session ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return uuidv4();
    
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Track an event with guardrails
   */
  public async track(eventName: string, properties: BaseEventProperties = {}): Promise<void> {
    try {
      // 1. Rate limiting check
      if (!this.checkRateLimit(eventName)) {
        console.warn(`[EventTracker] Rate limit exceeded for event: ${eventName}`);
        return;
      }

      // 2. Validate event properties
      const validatedProps = this.validateProperties(eventName, properties);

      // 3. Remove PII
      const sanitizedProps = this.sanitizeProperties(validatedProps);

      // 4. Add standard properties
      const enrichedProps = this.enrichProperties(sanitizedProps);

      // 5. Create tracked event
      const event: TrackedEvent = {
        event_name: eventName,
        properties: enrichedProps,
        user_id: await this.getUserId(),
      };

      // 6. Add to queue
      this.eventQueue.push(event);

      // 7. Process queue if batch size reached
      if (this.eventQueue.length >= 10) {
        await this.processBatch();
      }

    } catch (error) {
      // Error boundary - don't break the app
      console.error('[EventTracker] Error tracking event:', error);
      this.logError(eventName, error);
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(eventName: string): boolean {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.lastMinuteReset > 60000) {
      this.eventCounts.clear();
      this.lastMinuteReset = now;
    }

    // Check per-minute limit
    const minuteCount = this.eventCounts.get('total') || 0;
    if (minuteCount >= RATE_LIMIT.maxEventsPerMinute) {
      return false;
    }

    // Check session limit
    if (this.sessionEventCount >= RATE_LIMIT.maxEventsPerSession) {
      return false;
    }

    // Update counts
    this.eventCounts.set('total', minuteCount + 1);
    this.eventCounts.set(eventName, (this.eventCounts.get(eventName) || 0) + 1);
    this.sessionEventCount++;

    return true;
  }

  /**
   * Validate event properties against rules
   */
  private validateProperties(eventName: string, properties: BaseEventProperties): BaseEventProperties {
    const rules = EVENT_RULES[eventName];
    if (!rules) return properties;

    const validated: BaseEventProperties = {};

    // Check required properties
    if (rules.required) {
      for (const field of rules.required) {
        if (!(field in properties)) {
          console.warn(`[EventTracker] Missing required property '${field}' for event '${eventName}'`);
        } else {
          validated[field] = properties[field];
        }
      }
    }

    // Add optional properties
    if (rules.optional) {
      for (const field of rules.optional) {
        if (field in properties) {
          validated[field] = properties[field];
        }
      }
    }

    // Add any other properties not in rules (be flexible)
    for (const [key, value] of Object.entries(properties)) {
      if (!(key in validated)) {
        validated[key] = value;
      }
    }

    return validated;
  }

  /**
   * Remove or hash PII from properties
   */
  private sanitizeProperties(properties: BaseEventProperties): BaseEventProperties {
    const sanitized: BaseEventProperties = {};

    for (const [key, value] of Object.entries(properties)) {
      // Check if key contains PII field names
      const isPII = PII_FIELDS.some(field => 
        key.toLowerCase().includes(field)
      );

      if (isPII) {
        // Hash PII instead of storing raw
        if (typeof value === 'string') {
          sanitized[`${key}_hash`] = this.hashString(value);
        }
        // Skip the original PII field
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Simple hash function for PII
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Add standard properties to events
   */
  private enrichProperties(properties: BaseEventProperties): BaseEventProperties {
    return {
      ...properties,
      timestamp: properties.timestamp || new Date().toISOString(),
      session_id: this.sessionId,
      page_url: properties.page_url || (typeof window !== 'undefined' ? window.location.href : undefined),
      referrer: properties.referrer || (typeof document !== 'undefined' ? document.referrer : undefined),
      user_agent: properties.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
      // Add viewport info
      viewport_width: typeof window !== 'undefined' ? window.innerWidth : undefined,
      viewport_height: typeof window !== 'undefined' ? window.innerHeight : undefined,
      screen_width: typeof screen !== 'undefined' ? screen.width : undefined,
      screen_height: typeof screen !== 'undefined' ? screen.height : undefined,
    };
  }

  /**
   * Get current user ID if authenticated
   */
  private async getUserId(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch {
      return undefined;
    }
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    if (!this.isOnline) return; // Wait until online

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to server endpoint
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue.unshift(...batch);
        console.error('[EventTracker] Failed to send events:', response.statusText);
      }
    } catch (error) {
      // Re-queue events on network error
      this.eventQueue.unshift(...batch);
      console.error('[EventTracker] Network error sending events:', error);
      
      // Store in localStorage for later retry
      this.storeFailedEvents(batch);
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    // Process batch every 5 seconds
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, 5000);
  }

  /**
   * Store failed events in localStorage for retry
   */
  private storeFailedEvents(events: TrackedEvent[]): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('analytics_failed_events');
      const existing = stored ? JSON.parse(stored) : [];
      const combined = [...existing, ...events];
      
      // Keep only last 100 events to prevent storage overflow
      const trimmed = combined.slice(-100);
      localStorage.setItem('analytics_failed_events', JSON.stringify(trimmed));
    } catch (error) {
      console.error('[EventTracker] Failed to store events:', error);
    }
  }

  /**
   * Retry failed events from localStorage
   */
  private async retryFailedEvents(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('analytics_failed_events');
      if (!stored) return;

      const events = JSON.parse(stored);
      if (events.length > 0) {
        this.eventQueue.push(...events);
        localStorage.removeItem('analytics_failed_events');
        await this.processBatch();
      }
    } catch (error) {
      console.error('[EventTracker] Failed to retry events:', error);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true;
    this.retryFailedEvents();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false;
  }

  /**
   * Flush all pending events
   */
  public async flush(): Promise<void> {
    await this.processBatch();
  }

  /**
   * Log error for monitoring
   */
  private logError(eventName: string, error: any): void {
    // Could send to error tracking service
    console.error('[EventTracker] Error:', {
      event: eventName,
      error: error.message || error,
      stack: error.stack,
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.flush();
  }
}

// Create singleton instance
let instance: EventTrackerService | null = null;

export function getEventTracker(): EventTrackerService {
  if (!instance) {
    instance = new EventTrackerService();
  }
  return instance;
}

// Export convenience function
export async function trackEvent(eventName: string, properties?: BaseEventProperties): Promise<void> {
  return getEventTracker().track(eventName, properties);
}