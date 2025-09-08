// Type definitions for affiliate links and video features

export type VideoProvider = 'youtube' | 'tiktok' | 'vimeo' | 'other';

// User Equipment Links (Affiliate/Recommended links on bag items)
export interface UserEquipmentLink {
  id: string;
  user_id: string;
  bag_id: string;
  bag_equipment_id: string;
  equipment_id?: string | null;
  label: string;              // "Buy on Amazon", "My eBay listing", etc.
  url: string;
  is_primary: boolean;        // Primary CTA button
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Equipment Videos (Community-contributed videos)
export interface EquipmentVideo {
  id: string;
  equipment_id: string;
  provider: VideoProvider;
  video_id?: string | null;   // Extracted video ID (YouTube, TikTok, etc.)
  url: string;
  title?: string | null;
  channel?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;    // Duration in seconds
  added_by_user_id?: string | null;
  verified: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  added_by?: {
    id: string;
    username?: string;
    display_name?: string;
  };
}

// User Bag Videos (Bag-level recommended videos)
export interface UserBagVideo {
  id: string;
  user_id: string;
  bag_id: string;
  provider: VideoProvider;
  video_id?: string | null;
  url: string;
  title?: string | null;
  thumbnail_url?: string | null;
  channel_name?: string | null;  // YouTube channel or video creator name
  notes?: string | null;       // User's description/notes
  share_to_feed: boolean;      // Share to activity feed
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Link Click Analytics
export interface LinkClick {
  id: string;
  link_id: string;
  clicked_by_user?: string | null;
  bag_id?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// Extended types for UI components
export interface UserEquipmentLinkWithStats extends UserEquipmentLink {
  click_count: number;
  last_clicked?: string | null;
  revenue_generated?: number;
}

export interface EquipmentVideoWithEngagement extends EquipmentVideo {
  likes_count: number;
  is_liked_by_user?: boolean;
  comments_count: number;
}

// Form data types
export interface CreateUserEquipmentLinkData {
  bag_equipment_id: string;
  label: string;
  url: string;
  is_primary?: boolean;
}

export interface CreateEquipmentVideoData {
  equipment_id: string;
  url: string;
  title?: string;
  channel?: string;
}

export interface CreateUserBagVideoData {
  bag_id: string;
  url: string;
  title?: string;
  notes?: string;
  share_to_feed?: boolean;
}

// Video metadata extracted from URLs
export interface VideoMetadata {
  provider: VideoProvider;
  video_id: string | null;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
  duration?: number;
  embed_url: string;
}

// Affiliate link metadata
export interface AffiliateLinkMetadata {
  retailer?: string;
  product_id?: string;
  is_affiliate: boolean;
  commission_rate?: number;
  tracking_params?: Record<string, string>;
}