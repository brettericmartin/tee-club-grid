/**
 * Beta User Journey Analytics
 * Track user activation and engagement post-approval
 */

import { trackEvent, identify } from '../analytics';
import { EventName, BetaEventProperties, BagEventProperties, SocialEventProperties } from '../events';

// Track beta approval
export function trackBetaApproved(
  userId: string,
  email: string,
  approvalMethod: 'manual' | 'auto' | 'bulk',
  score: number,
  referralCount: number,
  daysInWaitlist: number,
  properties?: Partial<BetaEventProperties>
) {
  trackEvent(EventName.BETA_APPROVED, {
    user_id: userId,
    email,
    approval_method: approvalMethod,
    score,
    referral_count: referralCount,
    days_in_waitlist: daysInWaitlist,
    ...properties
  });
  
  // Update user identity with beta status
  identify(userId, {
    beta_access: true,
    approval_date: new Date().toISOString(),
    approval_method: approvalMethod,
    waitlist_score: score
  });
}

// Track beta approval email sent
export function trackBetaEmailSent(
  userId: string,
  email: string,
  emailType: 'approval' | 'welcome' | 'invite_pack',
  properties?: Partial<BetaEventProperties>
) {
  trackEvent(EventName.BETA_EMAIL_SENT, {
    user_id: userId,
    email,
    email_type: emailType,
    ...properties
  });
}

// Track first login after beta approval
export function trackBetaFirstLogin(
  userId: string,
  timeSinceApproval?: number,
  loginMethod?: 'email' | 'google' | 'magic_link',
  properties?: Partial<BetaEventProperties>
) {
  // Check if this is truly the first login
  const isFirstLogin = !localStorage.getItem(`beta_first_login_${userId}`);
  if (!isFirstLogin) return;
  
  localStorage.setItem(`beta_first_login_${userId}`, Date.now().toString());
  
  trackEvent(EventName.BETA_FIRST_LOGIN, {
    user_id: userId,
    time_since_approval_ms: timeSinceApproval,
    login_method: loginMethod,
    ...properties
  });
  
  // Update user segment
  identify(userId, {
    activated: true,
    activation_date: new Date().toISOString()
  });
}

// Track first bag creation
export function trackBagCreatedFirstTime(
  userId: string,
  bagId: string,
  bagName: string,
  isPublic: boolean,
  properties?: Partial<BagEventProperties>
) {
  // Check if this is the first bag
  const isFirstBag = !localStorage.getItem(`first_bag_${userId}`);
  if (!isFirstBag) return;
  
  localStorage.setItem(`first_bag_${userId}`, bagId);
  
  trackEvent(EventName.BAG_CREATED_FIRST_TIME, {
    user_id: userId,
    bag_id: bagId,
    bag_name: bagName,
    is_public: isPublic,
    is_first_bag: true,
    ...properties
  });
  
  // Update user profile
  identify(userId, {
    has_bag: true,
    first_bag_date: new Date().toISOString()
  });
}

// Track first equipment added
export function trackEquipmentAddedFirst(
  userId: string,
  equipmentId: string,
  category: string,
  brand: string,
  properties?: any
) {
  // Check if this is the first equipment
  const isFirstEquipment = !localStorage.getItem(`first_equipment_${userId}`);
  if (!isFirstEquipment) return;
  
  localStorage.setItem(`first_equipment_${userId}`, equipmentId);
  
  trackEvent(EventName.EQUIPMENT_ADDED_FIRST, {
    user_id: userId,
    equipment_id: equipmentId,
    category,
    brand,
    is_first_equipment: true,
    ...properties
  });
}

// Track first post published
export function trackFirstPostPublished(
  userId: string,
  postId: string,
  postType: string,
  hasMedia: boolean,
  properties?: Partial<SocialEventProperties>
) {
  // Check if this is the first post
  const isFirstPost = !localStorage.getItem(`first_post_${userId}`);
  if (!isFirstPost) return;
  
  localStorage.setItem(`first_post_${userId}`, postId);
  
  trackEvent(EventName.FIRST_POST_PUBLISHED, {
    user_id: userId,
    post_id: postId,
    post_type: postType,
    has_media: hasMedia,
    is_first_post: true,
    ...properties
  });
  
  // Update user as fully activated
  identify(userId, {
    fully_activated: true,
    first_post_date: new Date().toISOString()
  });
}

// Track onboarding progress
export function trackOnboardingStarted(userId: string) {
  trackEvent(EventName.ONBOARDING_STARTED, {
    user_id: userId,
    timestamp: Date.now()
  });
}

export function trackOnboardingStepCompleted(
  userId: string,
  step: number,
  stepName: string,
  timeOnStep?: number
) {
  trackEvent(EventName.ONBOARDING_STEP_COMPLETED, {
    user_id: userId,
    step_number: step,
    step_name: stepName,
    time_on_step_ms: timeOnStep
  } as any);
}

export function trackOnboardingCompleted(
  userId: string,
  totalTime: number,
  stepsCompleted: number
) {
  trackEvent(EventName.ONBOARDING_COMPLETED, {
    user_id: userId,
    total_time_ms: totalTime,
    steps_completed: stepsCompleted
  } as any);
  
  // Mark user as onboarded
  identify(userId, {
    onboarded: true,
    onboarding_completed_at: new Date().toISOString()
  });
}

export function trackOnboardingSkipped(
  userId: string,
  atStep: number,
  reason?: string
) {
  trackEvent(EventName.ONBOARDING_SKIPPED, {
    user_id: userId,
    skipped_at_step: atStep,
    skip_reason: reason
  } as any);
}

// Track user activation funnel
export function trackActivationMilestone(
  userId: string,
  milestone: 'signed_up' | 'created_bag' | 'added_equipment' | 'uploaded_photo' | 'published_post' | 'fully_activated',
  properties?: any
) {
  trackEvent(`activation_milestone_${milestone}`, {
    user_id: userId,
    milestone,
    ...properties
  });
  
  // Check if fully activated (all key actions completed)
  if (milestone === 'fully_activated') {
    identify(userId, {
      power_user: true,
      activation_completed: new Date().toISOString()
    });
  }
}

// Track beta user retention
export function trackBetaUserRetention(
  userId: string,
  daysSinceApproval: number,
  isActive: boolean,
  lastActiveDate: string
) {
  trackEvent('beta_user_retention', {
    user_id: userId,
    days_since_approval: daysSinceApproval,
    is_active: isActive,
    last_active_date: lastActiveDate,
    retention_cohort: Math.floor(daysSinceApproval / 7) // Weekly cohorts
  } as any);
}

// Track beta conversion metrics
export function trackBetaConversionMetrics(metrics: {
  totalApproved: number;
  totalActivated: number;
  avgTimeToActivation: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  conversionFunnel: {
    approved: number;
    loggedIn: number;
    createdBag: number;
    addedEquipment: number;
    publishedPost: number;
  };
}) {
  trackEvent('beta_conversion_metrics', {
    ...metrics,
    timestamp: Date.now()
  } as any);
}