import { supabase } from '@/lib/supabase';
import { parseVideoUrl, generateThumbnailUrl } from '@/utils/videoUtils';
import { userBagVideoSchema } from '@/types/zodSchemas';
import type { 
  UserBagVideo,
  CreateUserBagVideoData 
} from '@/types/affiliateVideos';
import type { FeedPost } from './feedService';

/**
 * List videos for a specific bag
 */
export async function listBagVideos(bagId: string) {
  return supabase
    .from('user_bag_videos')
    .select('*')
    .eq('bag_id', bagId)
    .order('created_at', { ascending: false });
}

/**
 * Get videos for a specific bag (legacy compatibility)
 */
export async function getBagVideos(bagId: string): Promise<UserBagVideo[]> {
  try {
    const { data, error } = await supabase
      .from('user_bag_videos')
      .select('*')
      .eq('bag_id', bagId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bag videos:', error);
    return [];
  }
}

/**
 * Get all videos shared to feed
 */
export async function getFeedVideos(limit: number = 20): Promise<UserBagVideo[]> {
  try {
    const { data, error } = await supabase
      .from('user_bag_videos')
      .select(`
        *,
        user:profiles!user_id(
          id,
          username,
          display_name,
          avatar_url
        ),
        bag:user_bags!bag_id(
          id,
          name,
          total_value
        )
      `)
      .eq('share_to_feed', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching feed videos:', error);
    return [];
  }
}

/**
 * Check if a video URL has been posted to feed recently
 */
export async function checkRecentVideoInFeed(
  videoUrl: string,
  daysBack: number = 7
): Promise<{ 
  exists: boolean; 
  post?: FeedPost & { 
    profile?: { 
      id: string; 
      username: string; 
      display_name: string; 
      avatar_url?: string;
    } 
  };
}> {
  try {
    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    // Parse the video URL to get a normalized version
    const parsed = parseVideoUrl(videoUrl);
    
    // Search for feed posts with this video URL in the content
    // Note: This searches the JSONB content field for the URL
    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('type', 'bag_video')
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking for duplicate video:', error);
      return { exists: false };
    }

    // Check if any post contains this video URL
    const matchingPost = posts?.find(post => {
      const content = post.content as any;
      if (content?.url === videoUrl || content?.url === parsed.url) {
        return true;
      }
      // Also check for same video ID if it exists
      if (parsed.videoId && content?.video_id === parsed.videoId) {
        return true;
      }
      return false;
    });

    return {
      exists: !!matchingPost,
      post: matchingPost
    };
  } catch (error) {
    console.error('Error in checkRecentVideoInFeed:', error);
    return { exists: false };
  }
}

/**
 * Add bag video with validation and duplicate checking
 */
export async function addBagVideo(input: unknown) {
  const payload = userBagVideoSchema.parse(input);
  const parsed = parseVideoUrl(payload.url);
  
  // Check for duplicate if sharing to feed
  if (payload.share_to_feed) {
    const duplicate = await checkRecentVideoInFeed(payload.url);
    if (duplicate.exists) {
      // Return a special response indicating duplicate found
      return {
        data: null,
        error: null,
        duplicate: duplicate.post
      };
    }
  }
  
  // Insert the video
  const { data, error } = await supabase
    .from('user_bag_videos')
    .insert({
      bag_id: payload.bag_id,
      url: parsed.url,
      provider: parsed.provider,
      video_id: parsed.videoId || null,
      title: payload.title,
      notes: payload.notes,
      share_to_feed: payload.share_to_feed ?? false
    })
    .select()
    .single();

  // Create feed post if sharing to feed
  if (data && payload.share_to_feed) {
    const { user } = await supabase.auth.getUser();
    if (user?.user) {
      await createBagVideoFeedPost({
        user_id: user.user.id,
        bag_id: payload.bag_id,
        video: data,
        title: payload.title
      });
    }
  }

  return { data, error, duplicate: null };
}

/**
 * Add a video to a bag (legacy compatibility)
 */
export async function addBagVideoLegacy(
  userId: string,
  data: CreateUserBagVideoData
): Promise<UserBagVideo | null> {
  try {
    // Check if video already exists for this bag
    const { count: existingCount } = await supabase
      .from('user_bag_videos')
      .select('*', { count: 'exact', head: true })
      .eq('bag_id', data.bag_id)
      .eq('url', data.url);

    if (existingCount && existingCount > 0) {
      throw new Error('This video has already been added to the bag');
    }

    // Parse video URL to extract metadata
    const parsed = parseVideoUrl(data.url);

    // Get the next sort order
    const { data: lastVideo } = await supabase
      .from('user_bag_videos')
      .select('sort_order')
      .eq('bag_id', data.bag_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastVideo ? lastVideo.sort_order + 1 : 0;

    // Prepare video data
    const videoData = {
      user_id: userId,
      bag_id: data.bag_id,
      provider: parsed.provider,
      video_id: parsed.videoId || null,
      url: parsed.url,
      title: data.title || null,
      thumbnail_url: null,
      notes: data.notes || null,
      share_to_feed: data.share_to_feed || false,
      sort_order: nextSortOrder
    };

    const { data: video, error } = await supabase
      .from('user_bag_videos')
      .insert(videoData)
      .select()
      .single();

    if (error) throw error;

    // Generate thumbnail for YouTube if not already set
    if (video && parsed.provider === 'youtube' && parsed.videoId && !video.thumbnail_url) {
      const thumbnailUrl = generateThumbnailUrl('youtube', parsed.videoId);
      if (thumbnailUrl) {
        await updateBagVideo(video.id, userId, { thumbnail_url: thumbnailUrl });
        video.thumbnail_url = thumbnailUrl;
      }
    }

    // If shared to feed, create a feed post (optional)
    if (video && data.share_to_feed) {
      await createVideoFeedPost(video, userId);
    }

    return video;
  } catch (error) {
    console.error('Error adding bag video:', error);
    return null;
  }
}

/**
 * Update a bag video
 */
export async function updateBagVideo(
  videoId: string,
  userId: string,
  updates: Partial<UserBagVideo>
): Promise<boolean> {
  try {
    // Check if changing feed sharing status
    if ('share_to_feed' in updates) {
      const { data: currentVideo } = await supabase
        .from('user_bag_videos')
        .select('share_to_feed')
        .eq('id', videoId)
        .eq('user_id', userId)
        .single();

      if (currentVideo && !currentVideo.share_to_feed && updates.share_to_feed) {
        // Video is being shared to feed for the first time
        const { data: video } = await supabase
          .from('user_bag_videos')
          .select('*')
          .eq('id', videoId)
          .single();
        
        if (video) {
          await createVideoFeedPost(video, userId);
        }
      }
    }

    const { error } = await supabase
      .from('user_bag_videos')
      .update(updates)
      .eq('id', videoId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating bag video:', error);
    return false;
  }
}

/**
 * Delete a bag video
 */
export async function deleteBagVideo(
  videoId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_bag_videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting bag video:', error);
    return false;
  }
}

/**
 * Reorder bag videos
 */
export async function reorderBagVideos(
  bagId: string,
  userId: string,
  videoIds: string[]
): Promise<boolean> {
  try {
    // Verify ownership
    const { data: bag } = await supabase
      .from('user_bags')
      .select('user_id')
      .eq('id', bagId)
      .single();

    if (!bag || bag.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Update sort orders
    const updates = videoIds.map((videoId, index) => ({
      id: videoId,
      sort_order: index
    }));

    // Batch update (would need a stored procedure for true batch update)
    for (const update of updates) {
      await supabase
        .from('user_bag_videos')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('bag_id', bagId);
    }

    return true;
  } catch (error) {
    console.error('Error reordering bag videos:', error);
    return false;
  }
}

/**
 * Get user's video statistics
 */
export async function getUserVideoStats(userId: string): Promise<{
  total_videos: number;
  feed_shared: number;
  total_views: number;
  bags_with_videos: number;
}> {
  try {
    const { data: videos, error } = await supabase
      .from('user_bag_videos')
      .select('bag_id, share_to_feed')
      .eq('user_id', userId);

    if (error) throw error;

    if (!videos || videos.length === 0) {
      return {
        total_videos: 0,
        feed_shared: 0,
        total_views: 0,
        bags_with_videos: 0
      };
    }

    const uniqueBags = new Set(videos.map(v => v.bag_id));
    const feedShared = videos.filter(v => v.share_to_feed).length;

    return {
      total_videos: videos.length,
      feed_shared: feedShared,
      total_views: 0, // TODO: Implement view tracking
      bags_with_videos: uniqueBags.size
    };
  } catch (error) {
    console.error('Error fetching user video stats:', error);
    return {
      total_videos: 0,
      feed_shared: 0,
      total_views: 0,
      bags_with_videos: 0
    };
  }
}

/**
 * Search bag videos
 */
export async function searchBagVideos(
  query: string,
  limit: number = 20
): Promise<UserBagVideo[]> {
  try {
    const { data, error } = await supabase
      .from('user_bag_videos')
      .select(`
        *,
        user:profiles!user_id(
          id,
          username,
          display_name
        ),
        bag:user_bags!bag_id(
          id,
          name
        )
      `)
      .or(`title.ilike.%${query}%,notes.ilike.%${query}%`)
      .eq('share_to_feed', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching bag videos:', error);
    return [];
  }
}

/**
 * Create a feed post for a shared bag video
 */
export async function createBagVideoFeedPost(args: {
  user_id: string;
  bag_id: string;
  video: UserBagVideo;
  title?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: args.user_id,
        type: 'bag_video',
        bag_id: args.bag_id,
        content: {
          video_id: args.video.id,
          url: args.video.url,
          provider: args.video.provider,
          video_provider_id: args.video.video_id,
          title: args.title || args.video.title,
          notes: args.video.notes,
          thumbnail_url: args.video.thumbnail_url,
          user_bag_video_id: args.video.id
        },
        likes_count: 0
      });

    if (error) {
      console.error('Error creating video feed post:', error);
    }
  } catch (error) {
    console.error('Error creating video feed post:', error);
  }
}

/**
 * Create a feed post for a shared video (legacy)
 */
async function createVideoFeedPost(
  video: UserBagVideo,
  userId: string
): Promise<void> {
  try {
    // Get bag info for the feed post
    const { data: bagData } = await supabase
      .from('user_bags')
      .select('id')
      .eq('id', video.bag_id)
      .single();

    if (bagData) {
      await createBagVideoFeedPost({
        user_id: userId,
        bag_id: video.bag_id,
        video: video,
        title: video.title || undefined
      });
    }
  } catch (error) {
    console.error('Error creating video feed post:', error);
  }
}

/**
 * Get videos from followed users
 */
export async function getFollowedUsersVideos(
  userId: string,
  limit: number = 20
): Promise<UserBagVideo[]> {
  try {
    // First get followed users
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!following || following.length === 0) {
      return [];
    }

    const followedUserIds = following.map(f => f.following_id);

    // Get videos from followed users
    const { data, error } = await supabase
      .from('user_bag_videos')
      .select(`
        *,
        user:profiles!user_id(
          id,
          username,
          display_name,
          avatar_url
        ),
        bag:user_bags!bag_id(
          id,
          name
        )
      `)
      .in('user_id', followedUserIds)
      .eq('share_to_feed', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching followed users videos:', error);
    return [];
  }
}