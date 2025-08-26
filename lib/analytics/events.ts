/**
 * Analytics Event Definitions
 * Type-safe event tracking for the entire user funnel
 */

// Event Categories
export const EventCategory = {
  WAITLIST: 'waitlist',
  REFERRAL: 'referral',
  BETA: 'beta',
  USER: 'user',
  BAG: 'bag',
  EQUIPMENT: 'equipment',
  SOCIAL: 'social',
  ENGAGEMENT: 'engagement',
  MONETIZATION: 'monetization'
} as const;

// Event Names
export const EventName = {
  // Waitlist Funnel
  WAITLIST_VIEWED: 'waitlist_viewed',
  WAITLIST_FORM_STARTED: 'waitlist_form_started',
  WAITLIST_SUBMITTED: 'waitlist_submitted',
  WAITLIST_SUCCESS_VIEWED: 'waitlist_success_viewed',
  WAITLIST_ERROR: 'waitlist_error',
  
  // Referral Loop
  REFERRAL_LINK_GENERATED: 'referral_link_generated',
  REFERRAL_LINK_COPIED: 'referral_link_copied',
  REFERRAL_LINK_SHARED: 'referral_link_shared',
  REFERRAL_VISIT: 'referral_visit',
  REFERRAL_SIGNUP: 'referral_signup',
  REFERRAL_CHAIN_CREATED: 'referral_chain_created',
  
  // Beta User Journey
  BETA_APPROVED: 'beta_approved',
  BETA_EMAIL_SENT: 'beta_email_sent',
  BETA_FIRST_LOGIN: 'beta_first_login',
  BAG_CREATED_FIRST_TIME: 'bag_created_first_time',
  EQUIPMENT_ADDED_FIRST: 'equipment_added_first',
  FIRST_POST_PUBLISHED: 'first_post_published',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  
  // User Engagement
  BAG_VIEWED: 'bag_viewed',
  BAG_EDITED: 'bag_edited',
  BAG_SHARED: 'bag_shared',
  EQUIPMENT_BROWSED: 'equipment_browsed',
  EQUIPMENT_SEARCHED: 'equipment_searched',
  EQUIPMENT_ADDED: 'equipment_added',
  EQUIPMENT_REMOVED: 'equipment_removed',
  PHOTO_UPLOADED: 'photo_uploaded',
  
  // Social Features
  POST_CREATED: 'post_created',
  POST_TEED: 'post_teed',
  POST_UNTEED: 'post_unteed',
  POST_COMMENTED: 'post_commented',
  USER_FOLLOWED: 'user_followed',
  USER_UNFOLLOWED: 'user_unfollowed',
  
  // Badges & Achievements
  BADGE_EARNED: 'badge_earned',
  BADGE_VIEWED: 'badge_viewed',
  
  // Monetization
  AFFILIATE_LINK_CLICKED: 'affiliate_link_clicked',
  PRICE_COMPARED: 'price_compared',
  PURCHASE_INTENT_SHOWN: 'purchase_intent_shown'
} as const;

// Event Properties Types
export interface BaseEventProperties {
  timestamp?: number;
  session_id?: string;
  user_id?: string;
  email?: string;
  referrer?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface WaitlistEventProperties extends BaseEventProperties {
  referral_code?: string;
  referred_by?: string;
  score?: number;
  role?: string;
  city_region?: string;
  queue_position?: number;
  error_message?: string;
  form_completion_time?: number;
}

export interface ReferralEventProperties extends BaseEventProperties {
  referral_code?: string;
  referrer_id?: string;
  referral_level?: number;
  share_channel?: string;
  signup_email?: string;
  chain_length?: number;
  viral_coefficient?: number;
}

export interface BetaEventProperties extends BaseEventProperties {
  approval_method?: 'manual' | 'auto' | 'bulk';
  days_in_waitlist?: number;
  referral_count?: number;
  score?: number;
  batch_id?: string;
}

export interface BagEventProperties extends BaseEventProperties {
  bag_id?: string;
  bag_name?: string;
  equipment_count?: number;
  is_public?: boolean;
  is_first_bag?: boolean;
  owner_id?: string;
  view_source?: string;
}

export interface EquipmentEventProperties extends BaseEventProperties {
  equipment_id?: string;
  equipment_name?: string;
  category?: string;
  brand?: string;
  model?: string;
  price?: number;
  action?: string;
  search_query?: string;
  filter_criteria?: Record<string, any>;
}

export interface SocialEventProperties extends BaseEventProperties {
  post_id?: string;
  post_type?: string;
  author_id?: string;
  interaction_type?: string;
  content_length?: number;
  has_media?: boolean;
  is_first_post?: boolean;
}

export interface BadgeEventProperties extends BaseEventProperties {
  badge_id?: string;
  badge_name?: string;
  badge_category?: string;
  badge_tier?: number;
  trigger_action?: string;
}

export interface MonetizationEventProperties extends BaseEventProperties {
  link_type?: string;
  product_id?: string;
  product_name?: string;
  brand?: string;
  price?: number;
  comparison_count?: number;
  click_position?: string;
  intent_score?: number;
}

// Combined Event Properties Type
export type EventProperties =
  | WaitlistEventProperties
  | ReferralEventProperties
  | BetaEventProperties
  | BagEventProperties
  | EquipmentEventProperties
  | SocialEventProperties
  | BadgeEventProperties
  | MonetizationEventProperties;

// Event Type Definition
export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: EventProperties;
  timestamp: number;
  session_id: string;
}

// Conversion Funnel Steps
export const FunnelStep = {
  VISITOR: 'visitor',
  WAITLIST_VIEWER: 'waitlist_viewer',
  WAITLIST_APPLICANT: 'waitlist_applicant',
  APPROVED_USER: 'approved_user',
  ACTIVATED_USER: 'activated_user',
  ENGAGED_USER: 'engaged_user',
  POWER_USER: 'power_user'
} as const;

// Funnel Metrics
export interface FunnelMetrics {
  step: typeof FunnelStep[keyof typeof FunnelStep];
  count: number;
  conversion_rate?: number;
  avg_time_to_next?: number;
  drop_off_rate?: number;
}

// User Segments
export const UserSegment = {
  ORGANIC: 'organic',
  REFERRED: 'referred',
  INFLUENCER: 'influencer',
  CREATOR: 'creator',
  GOLFER: 'golfer',
  FITTER: 'fitter',
  HIGH_VALUE: 'high_value',
  AT_RISK: 'at_risk',
  CHURNED: 'churned'
} as const;

// Analytics Context
export interface AnalyticsContext {
  user_id?: string;
  session_id: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  locale?: string;
  timezone?: string;
  screen_resolution?: string;
  referrer_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  experiment_id?: string;
  experiment_variant?: string;
}

// Event Builder Helper
export class EventBuilder {
  private event: Partial<AnalyticsEvent>;
  
  constructor(name: string, category: string) {
    this.event = {
      name,
      category,
      timestamp: Date.now(),
      session_id: this.generateSessionId()
    };
  }
  
  withProperties(properties: EventProperties): EventBuilder {
    this.event.properties = {
      ...this.event.properties,
      ...properties
    };
    return this;
  }
  
  withContext(context: Partial<AnalyticsContext>): EventBuilder {
    this.event.properties = {
      ...this.event.properties,
      ...context
    };
    return this;
  }
  
  build(): AnalyticsEvent {
    return this.event as AnalyticsEvent;
  }
  
  private generateSessionId(): string {
    // Get or create session ID from localStorage
    const key = 'analytics_session_id';
    const existing = typeof window !== 'undefined' 
      ? window.localStorage.getItem(key) 
      : null;
    
    if (existing) {
      const parsed = JSON.parse(existing);
      const hourAgo = Date.now() - 60 * 60 * 1000;
      
      // Refresh session after 1 hour of inactivity
      if (parsed.timestamp > hourAgo) {
        return parsed.id;
      }
    }
    
    // Generate new session ID
    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(newSession));
    }
    
    return newSession.id;
  }
}

// Export helper functions
export function createEvent(
  name: string,
  category: string,
  properties?: EventProperties
): AnalyticsEvent {
  return new EventBuilder(name, category)
    .withProperties(properties || {})
    .build();
}

export function createFunnelEvent(
  step: typeof FunnelStep[keyof typeof FunnelStep],
  properties?: EventProperties
): AnalyticsEvent {
  return createEvent(`funnel_${step}`, EventCategory.USER, {
    ...properties,
    funnel_step: step
  } as any);
}