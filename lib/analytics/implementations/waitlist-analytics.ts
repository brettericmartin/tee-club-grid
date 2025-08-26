/**
 * Waitlist Analytics Implementation
 * Track all waitlist funnel events
 */

import { trackEvent } from '../analytics';
import { EventName, WaitlistEventProperties } from '../events';

// Track waitlist page view
export function trackWaitlistViewed(properties?: Partial<WaitlistEventProperties>) {
  const referralCode = getReferralCodeFromURL();
  const startTime = Date.now();
  
  // Store start time for form completion tracking
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('waitlist_start_time', startTime.toString());
  }
  
  trackEvent(EventName.WAITLIST_VIEWED, {
    referral_code: referralCode,
    referrer: document.referrer,
    ...properties
  });
}

// Track when user starts filling the form
export function trackWaitlistFormStarted(field: string, properties?: Partial<WaitlistEventProperties>) {
  const startTime = window.sessionStorage.getItem('waitlist_start_time');
  const timeToStart = startTime ? Date.now() - parseInt(startTime) : undefined;
  
  // Only track once per session
  const alreadyTracked = window.sessionStorage.getItem('waitlist_form_started');
  if (alreadyTracked) return;
  
  window.sessionStorage.setItem('waitlist_form_started', 'true');
  
  trackEvent(EventName.WAITLIST_FORM_STARTED, {
    first_field: field,
    time_to_start_ms: timeToStart,
    ...properties
  });
}

// Track successful form submission
export function trackWaitlistSubmitted(
  email: string,
  score: number,
  role: string,
  cityRegion: string,
  referralCode?: string,
  properties?: Partial<WaitlistEventProperties>
) {
  const startTime = window.sessionStorage.getItem('waitlist_start_time');
  const formCompletionTime = startTime ? Date.now() - parseInt(startTime) : undefined;
  
  trackEvent(EventName.WAITLIST_SUBMITTED, {
    email,
    score,
    role,
    city_region: cityRegion,
    referral_code: referralCode || getReferralCodeFromURL(),
    form_completion_time: formCompletionTime,
    ...properties
  });
  
  // Clear session storage
  window.sessionStorage.removeItem('waitlist_start_time');
  window.sessionStorage.removeItem('waitlist_form_started');
}

// Track success page view with queue position
export function trackWaitlistSuccessViewed(
  queuePosition: number,
  referralCode: string,
  properties?: Partial<WaitlistEventProperties>
) {
  trackEvent(EventName.WAITLIST_SUCCESS_VIEWED, {
    queue_position: queuePosition,
    referral_code: referralCode,
    has_referral_code: !!referralCode,
    ...properties
  });
}

// Track waitlist submission errors
export function trackWaitlistError(
  errorMessage: string,
  errorType: 'validation' | 'submission' | 'network' | 'duplicate',
  properties?: Partial<WaitlistEventProperties>
) {
  trackEvent(EventName.WAITLIST_ERROR, {
    error_message: errorMessage,
    error_type: errorType,
    ...properties
  });
}

// Helper function to get referral code from URL
function getReferralCodeFromURL(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || params.get('referral') || undefined;
}

// Track conversion funnel step completion
export function trackWaitlistFunnelStep(
  step: 'viewed' | 'started' | 'submitted' | 'success',
  properties?: Partial<WaitlistEventProperties>
) {
  const eventMap = {
    viewed: EventName.WAITLIST_VIEWED,
    started: EventName.WAITLIST_FORM_STARTED,
    submitted: EventName.WAITLIST_SUBMITTED,
    success: EventName.WAITLIST_SUCCESS_VIEWED
  };
  
  trackEvent(eventMap[step], {
    funnel_step: step,
    ...properties
  });
}

// Batch track waitlist metrics
export function trackWaitlistMetrics(metrics: {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  avgScore: number;
  conversionRate: number;
}) {
  trackEvent('waitlist_metrics_calculated', {
    ...metrics,
    timestamp: Date.now()
  } as any);
}