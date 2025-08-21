/**
 * Analytics utility for tracking events
 * Supports Vercel Analytics, PostHog, and GA4
 */

interface EventProperties {
  [key: string]: any;
}

// Check if we have analytics libraries available
const hasVercelAnalytics = typeof window !== 'undefined' && 'va' in window;
const hasGtag = typeof window !== 'undefined' && 'gtag' in window;

// PostHog initialization (if you add it later)
// import posthog from 'posthog-js';
// posthog.init('YOUR_API_KEY', { api_host: 'https://app.posthog.com' });

/**
 * Track an analytics event across all available platforms
 */
export function trackEvent(eventName: string, properties?: EventProperties) {
  try {
    // Vercel Analytics
    if (hasVercelAnalytics && (window as any).va) {
      (window as any).va('track', eventName, properties);
    }

    // Google Analytics 4 (if configured)
    if (hasGtag && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    // PostHog (uncomment when configured)
    // if (typeof posthog !== 'undefined') {
    //   posthog.capture(eventName, properties);
    // }

    // Console log in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] Event: ${eventName}`, properties);
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

/**
 * Waitlist-specific analytics events
 */
export const WaitlistEvents = {
  VIEW: 'waitlist_view',
  SUBMIT: 'waitlist_submit',
  APPROVED: 'waitlist_approved',
  PENDING: 'waitlist_pending',
  AT_CAPACITY: 'waitlist_at_capacity',
  INVITE_REDEEMED: 'invite_redeemed',
  BETA_SUMMARY_VIEW: 'beta_summary_view',
} as const;

/**
 * Beta Guard analytics events
 */
export const BetaGuardEvents = {
  BLOCKED: 'betaguard_blocked',
  PASSED: 'betaguard_passed',
} as const;

/**
 * Track waitlist view
 */
export function trackWaitlistView(source?: string) {
  trackEvent(WaitlistEvents.VIEW, {
    source,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track waitlist submission with outcome
 */
export function trackWaitlistSubmit(data: {
  role?: string;
  score?: number;
  hasInviteCode?: boolean;
  city?: string;
  outcome?: 'approved' | 'pending' | 'at_capacity';
}) {
  trackEvent(WaitlistEvents.SUBMIT, {
    role: data.role,
    score: data.score,
    has_invite_code: data.hasInviteCode,
    city: data.city,
    outcome: data.outcome,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track waitlist approval
 */
export async function trackWaitlistApproved(email: string, score?: number) {
  const emailHash = await hashEmailForAnalytics(email);
  trackEvent(WaitlistEvents.APPROVED, {
    email_hash: emailHash, // SHA-256 hash for privacy
    score,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track waitlist pending
 */
export function trackWaitlistPending(score?: number, position?: number) {
  trackEvent(WaitlistEvents.PENDING, {
    score,
    position,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track invite code redemption
 */
export function trackInviteRedeemed(success: boolean) {
  trackEvent(WaitlistEvents.INVITE_REDEEMED, {
    success,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track beta summary view
 */
export function trackBetaSummaryView(data: {
  approved: number;
  cap: number;
  remaining: number;
}) {
  trackEvent(WaitlistEvents.BETA_SUMMARY_VIEW, {
    approved: data.approved,
    cap: data.cap,
    remaining: data.remaining,
    fill_percentage: Math.round((data.approved / data.cap) * 100),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Simple email hash for privacy (legacy - deprecated)
 * @deprecated Use hashEmailForAnalytics instead
 */
function hashEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Deterministic SHA-256 email hash for analytics
 * Provides consistent, secure hashing of email addresses for privacy
 * @param email - The email address to hash
 * @returns A deterministic SHA-256 hash of the email (hex string)
 */
export async function hashEmailForAnalytics(email: string): Promise<string> {
  // Normalize email to lowercase for consistent hashing
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if crypto.subtle is available (browser environment)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedEmail);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  
  // Fallback for Node.js or environments without crypto.subtle
  // This would require importing crypto module in Node environment
  // For now, return a placeholder that indicates hashing is not available
  console.warn('[Analytics] SHA-256 hashing not available in this environment');
  return `legacy_${hashEmail(normalizedEmail)}`;
}

/**
 * Track when waitlist is at capacity
 */
export function trackWaitlistAtCapacity(data?: {
  spotsFilled?: number;
  cap?: number;
}) {
  trackEvent(WaitlistEvents.AT_CAPACITY, {
    spots_filled: data?.spotsFilled,
    cap: data?.cap,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track beta guard blocking user
 */
export function trackBetaGuardBlocked(data: {
  route: string;
  reason: 'no_beta_access' | 'not_authenticated' | 'beta_closed';
}) {
  trackEvent(BetaGuardEvents.BLOCKED, {
    route: data.route,
    reason: data.reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track beta guard allowing user through
 */
export function trackBetaGuardPassed(data: {
  route: string;
  hasBetaAccess?: boolean;
  publicBetaEnabled?: boolean;
}) {
  trackEvent(BetaGuardEvents.PASSED, {
    route: data.route,
    has_beta_access: data.hasBetaAccess,
    public_beta_enabled: data.publicBetaEnabled,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Synchronous version using the legacy hash for backwards compatibility
 * @deprecated Prefer hashEmailForAnalytics for new code
 */
export function hashEmailForAnalyticsSync(email: string): string {
  return hashEmail(email.toLowerCase().trim());
}