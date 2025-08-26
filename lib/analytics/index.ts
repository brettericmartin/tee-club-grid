/**
 * Analytics Module Export
 * Central export point for all analytics functionality
 */

// Core analytics service
export {
  default as analytics,
  trackEvent,
  identify,
  trackPage,
  trackGroup,
  flushEvents,
  trackWaitlistEvent,
  trackReferralEvent,
  trackBetaEvent,
  trackBagEvent,
  trackEngagementEvent
} from './analytics';

// Event definitions and types
export * from './events';

// Waitlist analytics
export {
  trackWaitlistViewed,
  trackWaitlistFormStarted,
  trackWaitlistSubmitted,
  trackWaitlistSuccessViewed,
  trackWaitlistError,
  trackWaitlistFunnelStep,
  trackWaitlistMetrics
} from './implementations/waitlist-analytics';

// Referral analytics
export {
  trackReferralLinkGenerated,
  trackReferralLinkCopied,
  trackReferralLinkShared,
  trackReferralVisit,
  trackReferralSignup,
  trackReferralChainCreated,
  trackViralCoefficient,
  trackReferralProgramMetrics,
  trackReferralReward,
  getReferralAttribution,
  trackReferralLeaderboardViewed
} from './implementations/referral-analytics';

// Beta user journey analytics
export {
  trackBetaApproved,
  trackBetaEmailSent,
  trackBetaFirstLogin,
  trackBagCreatedFirstTime,
  trackEquipmentAddedFirst,
  trackFirstPostPublished,
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
  trackActivationMilestone,
  trackBetaUserRetention,
  trackBetaConversionMetrics
} from './implementations/beta-analytics';

// Convenience function for tracking custom events
export function track(eventName: string, properties?: Record<string, any>) {
  trackEvent(eventName, properties);
}

// Initialize analytics on page load
if (typeof window !== 'undefined') {
  // Track page views automatically
  trackPage(window.location.pathname, {
    title: document.title,
    referrer: document.referrer,
    url: window.location.href
  });
  
  // Track referral visits if ref parameter present
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref') || urlParams.get('referral');
  if (refCode) {
    import('./implementations/referral-analytics').then(({ trackReferralVisit }) => {
      trackReferralVisit(refCode);
    });
  }
}