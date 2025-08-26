/**
 * Referral Analytics Implementation
 * Track all referral loop events and viral metrics
 */

import { trackEvent } from '../analytics';
import { EventName, ReferralEventProperties } from '../events';

// Track when a referral link is generated for a user
export function trackReferralLinkGenerated(
  userId: string,
  referralCode: string,
  source: 'waitlist_success' | 'profile' | 'email' | 'api',
  properties?: Partial<ReferralEventProperties>
) {
  trackEvent(EventName.REFERRAL_LINK_GENERATED, {
    referrer_id: userId,
    referral_code: referralCode,
    generation_source: source,
    ...properties
  });
}

// Track when a referral link is copied
export function trackReferralLinkCopied(
  referralCode: string,
  method: 'button' | 'manual' | 'keyboard',
  location: string,
  properties?: Partial<ReferralEventProperties>
) {
  trackEvent(EventName.REFERRAL_LINK_COPIED, {
    referral_code: referralCode,
    copy_method: method,
    copy_location: location,
    ...properties
  });
  
  // Also track as a share event for engagement metrics
  trackReferralLinkShared(referralCode, 'clipboard', properties);
}

// Track when a referral link is shared
export function trackReferralLinkShared(
  referralCode: string,
  channel: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'sms' | 'whatsapp' | 'clipboard' | 'other',
  properties?: Partial<ReferralEventProperties>
) {
  trackEvent(EventName.REFERRAL_LINK_SHARED, {
    referral_code: referralCode,
    share_channel: channel,
    ...properties
  });
}

// Track when someone visits via a referral link
export function trackReferralVisit(
  referralCode: string,
  referrerId?: string,
  properties?: Partial<ReferralEventProperties>
) {
  // Store referral visit in session for attribution
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('referral_visit', JSON.stringify({
      code: referralCode,
      referrer_id: referrerId,
      timestamp: Date.now()
    }));
  }
  
  trackEvent(EventName.REFERRAL_VISIT, {
    referral_code: referralCode,
    referrer_id: referrerId,
    landing_page: window.location.pathname,
    ...properties
  });
}

// Track successful referral signup
export function trackReferralSignup(
  referralCode: string,
  referrerId: string,
  signupEmail: string,
  referralLevel: number = 1,
  properties?: Partial<ReferralEventProperties>
) {
  // Calculate time from visit to signup
  let timeToSignup: number | undefined;
  if (typeof window !== 'undefined') {
    const visitData = window.sessionStorage.getItem('referral_visit');
    if (visitData) {
      const visit = JSON.parse(visitData);
      timeToSignup = Date.now() - visit.timestamp;
    }
  }
  
  trackEvent(EventName.REFERRAL_SIGNUP, {
    referral_code: referralCode,
    referrer_id: referrerId,
    signup_email: signupEmail,
    referral_level: referralLevel,
    time_to_signup_ms: timeToSignup,
    ...properties
  });
}

// Track multi-level referral chain creation
export function trackReferralChainCreated(
  originatorId: string,
  chainLength: number,
  totalSignups: number,
  properties?: Partial<ReferralEventProperties>
) {
  trackEvent(EventName.REFERRAL_CHAIN_CREATED, {
    referrer_id: originatorId,
    chain_length: chainLength,
    total_signups: totalSignups,
    ...properties
  });
}

// Calculate and track viral coefficient
export function trackViralCoefficient(
  userId: string,
  directReferrals: number,
  indirectReferrals: number,
  totalReferrals: number
) {
  // Viral coefficient = (invites sent * conversion rate)
  // Simplified: total referrals / 1 (assuming user is active)
  const viralCoefficient = totalReferrals;
  
  trackEvent('referral_viral_coefficient_calculated', {
    referrer_id: userId,
    direct_referrals: directReferrals,
    indirect_referrals: indirectReferrals,
    total_referrals: totalReferrals,
    viral_coefficient: viralCoefficient,
    is_viral: viralCoefficient > 1 // K > 1 means viral growth
  } as any);
}

// Track referral program performance
export function trackReferralProgramMetrics(metrics: {
  totalReferralLinks: number;
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
  avgReferralsPerUser: number;
  topReferrers: Array<{ userId: string; count: number }>;
}) {
  trackEvent('referral_program_metrics', {
    ...metrics,
    timestamp: Date.now()
  } as any);
}

// Track referral reward events (future monetization)
export function trackReferralReward(
  userId: string,
  rewardType: 'credits' | 'discount' | 'feature_unlock' | 'badge',
  rewardValue: any,
  triggerCount: number
) {
  trackEvent('referral_reward_earned', {
    referrer_id: userId,
    reward_type: rewardType,
    reward_value: rewardValue,
    trigger_count: triggerCount,
    timestamp: Date.now()
  } as any);
}

// Helper to attribute current session to referral
export function getReferralAttribution(): {
  code?: string;
  referrerId?: string;
  timestamp?: number;
} | null {
  if (typeof window === 'undefined') return null;
  
  const visitData = window.sessionStorage.getItem('referral_visit');
  if (!visitData) return null;
  
  try {
    return JSON.parse(visitData);
  } catch {
    return null;
  }
}

// Track referral leaderboard views
export function trackReferralLeaderboardViewed(
  viewerUserId?: string,
  viewerPosition?: number
) {
  trackEvent('referral_leaderboard_viewed', {
    user_id: viewerUserId,
    viewer_position: viewerPosition,
    timestamp: Date.now()
  } as any);
}