import type { FeedPost } from '@/services/feedService';

// UI-friendly feed item structure
export interface FeedItemData {
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandicap: number;
  userTitle?: string;
  postType: string;
  imageUrl: string;
  caption: string;
  likes: number;
  commentCount: number;
  timestamp: Date;
  isFromFollowed: boolean;
  isLiked: boolean;
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
  videoData?: {
    url: string;
    provider: string;
    videoId?: string;
    title?: string;
    thumbnailUrl?: string;
    channelName?: string;
  };
  mediaUrls?: string[];
  content?: any; // Add content for multi-equipment photos
}

// Transform database feed post to UI format
export function transformFeedPost(post: FeedPost & { 
  profile?: any; 
  bag?: any;
  isFollowed?: boolean;
  feed_likes?: Array<{ count: number }>;
}): FeedItemData {
  const content = post.content || {};
  
  // Extract data from content JSONB
  const caption = content.caption || content.bag_name || content.equipment_name || '';
  const photoUrl = content.photo_url || content.image_url || '';
  
  // Handle media URLs - check both media_urls and content
  let mediaUrls = post.media_urls || [];
  if (mediaUrls.length === 0 && photoUrl) {
    mediaUrls = [photoUrl];
  }
  // Also check for photos array in content (for multi-equipment posts)
  if (content.photos && Array.isArray(content.photos)) {
    mediaUrls = content.photos.map((p: any) => p.url || p.photo_url).filter(Boolean);
  }
  
  // Get primary image URL - fallback through various sources
  let imageUrl = mediaUrls[0] || photoUrl || content.image_url || '/placeholder.svg';
  
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
      imageUrl: photoUrl || content.image_url || imageUrl
    };
  }
  
  // Transform video data for bag_video posts
  let videoData = undefined;
  if (post.type === 'bag_video' && content) {
    // Try to extract channel name from title (often in format "Title - Channel Name" or "Title by Channel Name")
    let channelName = content.channel_name;
    
    // Known video mappings (can be expanded)
    const knownVideos: Record<string, string> = {
      'JosfaSgzSxM': 'Good Good',  // $1 vs $10,000 Golf Road Trip
      // Add more known video IDs and their channels here
    };
    
    // Check if we know this video's channel
    const videoId = content.video_provider_id || content.video_id;
    if (!channelName && videoId && knownVideos[videoId]) {
      channelName = knownVideos[videoId];
    }
    
    // Try to extract from title patterns
    if (!channelName && content.title) {
      // Try common YouTube title patterns
      const patterns = [
        / - (.+)$/,           // "Title - Channel Name"
        / by (.+)$/i,         // "Title by Channel Name"
        / \| (.+)$/,          // "Title | Channel Name"
        / from (.+)$/i,       // "Title from Channel Name"
      ];
      
      for (const pattern of patterns) {
        const match = content.title.match(pattern);
        if (match) {
          channelName = match[1].trim();
          break;
        }
      }
    }
    
    videoData = {
      url: content.url,
      provider: content.provider,
      videoId: content.video_provider_id || content.video_id,
      title: content.title,
      thumbnailUrl: content.thumbnail_url,
      channelName: channelName || content.channel_name
    };
    // For video posts, use thumbnail as the main image if available
    if (content.thumbnail_url) {
      imageUrl = content.thumbnail_url;
    }
  }
  
  // Get likes count - prefer likes_count field which is kept in sync via triggers
  // feed_likes array contains actual like records, not a count
  const likesCount = post.likes_count ?? post.feed_likes?.length ?? 0;
  
  return {
    postId: post.id,
    userId: post.user_id,
    userName: post.profile?.display_name || post.profile?.username || 'Unknown User',
    userAvatar: post.profile?.avatar_url || '',
    userHandicap: post.profile?.handicap || 0,
    userTitle: post.profile?.title,
    postType: post.type,
    imageUrl,
    caption,
    likes: likesCount,
    commentCount: 0, // Comments not implemented yet
    timestamp: new Date(post.created_at),
    isFromFollowed: post.isFollowed || false,
    isLiked: typeof post.user_liked === 'boolean' ? post.user_liked : (post.user_liked && post.user_liked.length > 0),
    bagId: post.bag_id || content.bag_id,
    equipmentId: post.equipment_id || content.equipment_id,
    bagData,
    equipmentData,
    videoData,
    mediaUrls,
    content // Pass through content for multi-equipment photos
  };
}

// Get display label for post type
export function getPostTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'new_equipment': 'New Equipment',
    'bag_update': 'Bag Update',
    'equipment_photo': 'Equipment Photo',
    'multi_equipment_photos': 'Equipment Gallery',
    'milestone': 'Milestone',
    'playing': 'Playing',
    'bag_created': 'New Bag',
    'bag_updated': 'Bag Update',
    'bag_video': 'Bag Video'
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