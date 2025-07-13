import type { FeedPost } from '@/services/feedService';

// UI-friendly feed item structure
export interface FeedItemData {
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandicap: number;
  postType: string;
  imageUrl: string;
  caption: string;
  likes: number;
  commentCount: number;
  timestamp: Date;
  isFromFollowed: boolean;
  bagId?: string;
  equipmentId?: string;
  bagData?: {
    id: string;
    name: string;
    featuredClubs: string[];
    totalValue: number;
  };
  equipmentData?: {
    id: string;
    name: string;
    brand: string;
    model: string;
    imageUrl?: string;
  };
  mediaUrls?: string[];
}

// Transform database feed post to UI format
export function transformFeedPost(post: FeedPost & { 
  profile?: any; 
  bag?: any;
  isFollowed?: boolean;
}): FeedItemData {
  const content = post.content || {};
  
  // Extract data from content JSONB
  const caption = content.caption || content.bag_name || content.equipment_name || '';
  const photoUrl = content.photo_url || '';
  const mediaUrls = post.media_urls || (photoUrl ? [photoUrl] : []);
  
  // Get primary image URL
  let imageUrl = mediaUrls[0] || photoUrl || '/placeholder.svg';
  
  // If we have bag data with equipment, use the first equipment image
  if (post.bag?.bag_equipment?.[0]?.equipment?.image_url) {
    imageUrl = post.bag.bag_equipment[0].equipment.image_url;
  }
  
  // Transform bag data if available
  let bagData = undefined;
  if (post.bag) {
    const featuredEquipment = post.bag.bag_equipment?.filter((be: any) => be.equipment) || [];
    const totalValue = featuredEquipment.reduce((sum: number, item: any) => 
      sum + (item.equipment?.msrp || 0), 0
    );
    
    bagData = {
      id: post.bag.id,
      name: post.bag.name,
      featuredClubs: featuredEquipment.slice(0, 3).map((be: any) => be.equipment?.id).filter(Boolean),
      totalValue
    };
  }
  
  // Transform equipment data if available
  let equipmentData = undefined;
  if (content.equipment_id && content.equipment_name) {
    equipmentData = {
      id: content.equipment_id,
      name: content.equipment_name,
      brand: content.equipment_name.split(' ')[0] || '',
      model: content.equipment_name.split(' ').slice(1).join(' ') || '',
      imageUrl: photoUrl
    };
  }
  
  return {
    postId: post.id,
    userId: post.user_id,
    userName: post.profile?.full_name || post.profile?.username || 'Unknown User',
    userAvatar: post.profile?.avatar_url || '',
    userHandicap: post.profile?.handicap || 0,
    postType: post.type,
    imageUrl,
    caption,
    likes: post.likes_count || 0,
    commentCount: 0, // Comments not implemented yet
    timestamp: new Date(post.created_at),
    isFromFollowed: post.isFollowed || false,
    bagId: post.bag_id || content.bag_id,
    equipmentId: post.equipment_id || content.equipment_id,
    bagData,
    equipmentData,
    mediaUrls
  };
}

// Get display label for post type
export function getPostTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'new_equipment': 'New Equipment',
    'bag_update': 'Bag Update',
    'equipment_photo': 'Equipment Photo',
    'milestone': 'Milestone',
    'playing': 'Playing'
  };
  return labels[type] || 'Post';
}

// Format relative timestamp
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}