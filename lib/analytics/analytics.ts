/**
 * Unified Analytics Service
 * Centralized analytics tracking with support for multiple providers
 */

import { track as vercelTrack } from '@vercel/analytics';
import { 
  AnalyticsEvent, 
  EventProperties, 
  AnalyticsContext,
  EventBuilder,
  createEvent,
  EventCategory,
  EventName
} from './events';
import { supabase } from '../supabase';

// Analytics Provider Interface
interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent): Promise<void>;
  identify(userId: string, traits?: Record<string, any>): Promise<void>;
  page(name?: string, properties?: Record<string, any>): Promise<void>;
  group(groupId: string, traits?: Record<string, any>): Promise<void>;
  flush?(): Promise<void>;
}

// Configuration
interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  providers: AnalyticsProvider[];
  context?: Partial<AnalyticsContext>;
  batchSize?: number;
  flushInterval?: number;
}

// Analytics Service Class
class AnalyticsService {
  private config: AnalyticsConfig;
  private queue: AnalyticsEvent[] = [];
  private context: AnalyticsContext;
  private userId?: string;
  private flushTimer?: NodeJS.Timeout;
  
  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enabled: true,
      debug: process.env.NODE_ENV === 'development',
      providers: [],
      batchSize: 20,
      flushInterval: 5000,
      ...config
    };
    
    this.context = this.buildContext();
    this.setupProviders();
    this.startBatchTimer();
  }
  
  private buildContext(): AnalyticsContext {
    if (typeof window === 'undefined') {
      return { session_id: 'server' };
    }
    
    const context: AnalyticsContext = {
      session_id: this.getSessionId(),
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      referrer_source: document.referrer,
      ...this.getUTMParams()
    };
    
    return context;
  }
  
  private setupProviders() {
    // Vercel Analytics Provider
    this.config.providers.push({
      name: 'vercel',
      async track(event: AnalyticsEvent) {
        vercelTrack(event.name, event.properties);
      },
      async identify(userId: string, traits?: Record<string, any>) {
        // Vercel Analytics doesn't have identify
      },
      async page(name?: string, properties?: Record<string, any>) {
        // Handled by Vercel Analytics automatically
      },
      async group(groupId: string, traits?: Record<string, any>) {
        // Not supported
      }
    });
    
    // Supabase Analytics Provider (custom events table)
    this.config.providers.push({
      name: 'supabase',
      async track(event: AnalyticsEvent) {
        try {
          const { error } = await supabase
            .from('analytics_events')
            .insert({
              event_name: event.name,
              event_category: event.category,
              properties: event.properties,
              session_id: event.session_id,
              user_id: event.properties?.user_id,
              created_at: new Date(event.timestamp).toISOString()
            });
          
          if (error && error.code !== '42P01') { // Ignore if table doesn't exist
            console.error('[Analytics] Supabase tracking error:', error);
          }
        } catch (err) {
          // Silently fail to not break the app
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Analytics] Supabase provider error:', err);
          }
        }
      },
      async identify(userId: string, traits?: Record<string, any>) {
        // Store user traits in profiles table
        try {
          await supabase
            .from('profiles')
            .update({ analytics_traits: traits })
            .eq('id', userId);
        } catch (err) {
          console.warn('[Analytics] Failed to update user traits:', err);
        }
      },
      async page(name?: string, properties?: Record<string, any>) {
        // Track page views
        this.track(createEvent('page_viewed', EventCategory.ENGAGEMENT, {
          page_name: name,
          ...properties
        } as any));
      },
      async group(groupId: string, traits?: Record<string, any>) {
        // Not implemented yet
      }
    });
    
    // Google Analytics Provider (if configured)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      this.config.providers.push({
        name: 'google',
        async track(event: AnalyticsEvent) {
          (window as any).gtag('event', event.name, {
            event_category: event.category,
            ...event.properties
          });
        },
        async identify(userId: string, traits?: Record<string, any>) {
          (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
            user_id: userId,
            user_properties: traits
          });
        },
        async page(name?: string, properties?: Record<string, any>) {
          (window as any).gtag('event', 'page_view', {
            page_title: name,
            ...properties
          });
        },
        async group(groupId: string, traits?: Record<string, any>) {
          // Not directly supported
        }
      });
    }
  }
  
  // Core tracking method
  async track(eventName: string, properties?: EventProperties): Promise<void> {
    if (!this.config.enabled) return;
    
    const event = createEvent(eventName, this.getCategoryFromEventName(eventName), {
      ...this.context,
      ...properties,
      user_id: this.userId || properties?.user_id
    } as any);
    
    if (this.config.debug) {
      console.log('[Analytics] Track:', event);
    }
    
    // Add to queue for batching
    this.queue.push(event);
    
    // Flush if batch size reached
    if (this.queue.length >= (this.config.batchSize || 20)) {
      await this.flush();
    }
  }
  
  // Identify user
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    this.userId = userId;
    
    if (!this.config.enabled) return;
    
    for (const provider of this.config.providers) {
      try {
        await provider.identify(userId, traits);
      } catch (error) {
        console.error(`[Analytics] ${provider.name} identify error:`, error);
      }
    }
  }
  
  // Track page view
  async page(name?: string, properties?: Record<string, any>): Promise<void> {
    if (!this.config.enabled) return;
    
    for (const provider of this.config.providers) {
      try {
        await provider.page(name, properties);
      } catch (error) {
        console.error(`[Analytics] ${provider.name} page error:`, error);
      }
    }
  }
  
  // Group user
  async group(groupId: string, traits?: Record<string, any>): Promise<void> {
    if (!this.config.enabled) return;
    
    for (const provider of this.config.providers) {
      try {
        await provider.group(groupId, traits);
      } catch (error) {
        console.error(`[Analytics] ${provider.name} group error:`, error);
      }
    }
  }
  
  // Flush queued events
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    for (const provider of this.config.providers) {
      try {
        // Send events in parallel to each provider
        await Promise.all(events.map(event => provider.track(event)));
        
        // Call provider flush if available
        if (provider.flush) {
          await provider.flush();
        }
      } catch (error) {
        console.error(`[Analytics] ${provider.name} flush error:`, error);
        // Re-queue failed events
        this.queue.unshift(...events);
      }
    }
  }
  
  // Helper methods
  private getSessionId(): string {
    const key = 'analytics_session_id';
    const existing = localStorage.getItem(key);
    
    if (existing) {
      const parsed = JSON.parse(existing);
      const hourAgo = Date.now() - 60 * 60 * 1000;
      
      if (parsed.timestamp > hourAgo) {
        // Update timestamp
        localStorage.setItem(key, JSON.stringify({
          ...parsed,
          timestamp: Date.now()
        }));
        return parsed.id;
      }
    }
    
    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(newSession));
    return newSession.id;
  }
  
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    return 'Other';
  }
  
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1) return 'iOS';
    return 'Other';
  }
  
  private getUTMParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const value = params.get(key);
      if (value) utm[key] = value;
    });
    
    return utm;
  }
  
  private getCategoryFromEventName(eventName: string): string {
    // Map event names to categories
    if (eventName.startsWith('waitlist_')) return EventCategory.WAITLIST;
    if (eventName.startsWith('referral_')) return EventCategory.REFERRAL;
    if (eventName.startsWith('beta_')) return EventCategory.BETA;
    if (eventName.startsWith('bag_')) return EventCategory.BAG;
    if (eventName.startsWith('equipment_')) return EventCategory.EQUIPMENT;
    if (eventName.startsWith('post_') || eventName.startsWith('user_')) return EventCategory.SOCIAL;
    if (eventName.startsWith('badge_')) return EventCategory.ENGAGEMENT;
    if (eventName.startsWith('affiliate_') || eventName.startsWith('price_')) return EventCategory.MONETIZATION;
    return EventCategory.USER;
  }
  
  private startBatchTimer() {
    if (typeof window === 'undefined') return;
    
    // Flush events periodically
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 5000);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
    
    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }
  
  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton instance
const analytics = new AnalyticsService({
  enabled: process.env.NODE_ENV === 'production' || process.env.ANALYTICS_ENABLED === 'true',
  debug: process.env.NODE_ENV === 'development'
});

// Export convenience methods
export const trackEvent = (name: string, properties?: EventProperties) => 
  analytics.track(name, properties);

export const identify = (userId: string, traits?: Record<string, any>) => 
  analytics.identify(userId, traits);

export const trackPage = (name?: string, properties?: Record<string, any>) => 
  analytics.page(name, properties);

export const trackGroup = (groupId: string, traits?: Record<string, any>) => 
  analytics.group(groupId, traits);

export const flushEvents = () => analytics.flush();

// Export specific event tracking functions
export const trackWaitlistEvent = (eventName: string, properties?: EventProperties) => 
  trackEvent(eventName, { category: EventCategory.WAITLIST, ...properties } as any);

export const trackReferralEvent = (eventName: string, properties?: EventProperties) => 
  trackEvent(eventName, { category: EventCategory.REFERRAL, ...properties } as any);

export const trackBetaEvent = (eventName: string, properties?: EventProperties) => 
  trackEvent(eventName, { category: EventCategory.BETA, ...properties } as any);

export const trackBagEvent = (eventName: string, properties?: EventProperties) => 
  trackEvent(eventName, { category: EventCategory.BAG, ...properties } as any);

export const trackEngagementEvent = (eventName: string, properties?: EventProperties) => 
  trackEvent(eventName, { category: EventCategory.ENGAGEMENT, ...properties } as any);

// Export the service instance for advanced usage
export default analytics;