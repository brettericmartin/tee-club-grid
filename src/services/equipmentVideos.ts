import { supabase } from '@/lib/supabase';
import { parseVideoUrl, generateThumbnailUrl } from '@/utils/videoUtils';
import { equipmentVideoSchema } from '@/types/zodSchemas';
import type { 
  EquipmentVideo, 
  EquipmentVideoWithEngagement,
  CreateEquipmentVideoData 
} from '@/types/affiliateVideos';

/**
 * List videos for a specific equipment
 */
export async function listEquipmentVideos(equipmentId: string) {
  return supabase
    .from('equipment_videos')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });
}

/**
 * Get videos for a specific equipment (legacy compatibility)
 */
export async function getEquipmentVideos(
  equipmentId: string,
  limit: number = 10
): Promise<EquipmentVideo[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_videos')
      .select(`
        *,
        added_by:profiles!added_by_user_id(
          id,
          username,
          display_name
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('verified', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching equipment videos:', error);
    return [];
  }
}

/**
 * Get all videos added by a user
 */
export async function getUserEquipmentVideos(
  userId: string
): Promise<EquipmentVideo[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_videos')
      .select(`
        *,
        equipment!inner(
          brand,
          model,
          category
        )
      `)
      .eq('added_by_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user equipment videos:', error);
    return [];
  }
}

/**
 * Add equipment video with validation
 */
export async function addEquipmentVideo(input: unknown) {
  const payload = equipmentVideoSchema.parse(input);
  const parsed = parseVideoUrl(payload.url);
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to add videos');
  }
  
  return supabase
    .from('equipment_videos')
    .insert({
      equipment_id: payload.equipment_id,
      url: parsed.url,
      provider: parsed.provider,
      video_id: parsed.videoId || null,
      title: payload.title,
      channel: payload.channel,
      added_by_user_id: user.id,
      verified: false, // Start unverified
      view_count: 0
    })
    .select()
    .single();
}

/**
 * Add a new video to equipment (legacy compatibility)
 */
export async function addEquipmentVideoLegacy(
  data: CreateEquipmentVideoData,
  userId: string
): Promise<EquipmentVideo | null> {
  try {
    // Parse video URL to extract metadata
    const parsed = parseVideoUrl(data.url);

    // Prepare video data
    const videoData = {
      equipment_id: data.equipment_id,
      provider: parsed.provider,
      video_id: parsed.videoId || null,
      url: parsed.url,
      title: data.title || null,
      channel: data.channel || null,
      thumbnail_url: null,
      added_by_user_id: userId,
      verified: false, // Start unverified, admin can verify later
      view_count: 0
    };

    const { data: video, error } = await supabase
      .from('equipment_videos')
      .insert(videoData)
      .select(`
        *,
        added_by:profiles!added_by_user_id(
          id,
          username,
          display_name
        )
      `)
      .single();

    if (error) throw error;

    // If YouTube video and no thumbnail, generate one
    if (video && parsed.provider === 'youtube' && parsed.videoId && !video.thumbnail_url) {
      const thumbnailUrl = generateThumbnailUrl('youtube', parsed.videoId);
      if (thumbnailUrl) {
        await updateEquipmentVideo(video.id, { thumbnail_url: thumbnailUrl });
        video.thumbnail_url = thumbnailUrl;
      }
    }

    return video;
  } catch (error) {
    console.error('Error adding equipment video:', error);
    return null;
  }
}

/**
 * Update a video
 */
export async function updateEquipmentVideo(
  videoId: string,
  updates: Partial<EquipmentVideo>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('equipment_videos')
      .update(updates)
      .eq('id', videoId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating equipment video:', error);
    return false;
  }
}

/**
 * Delete a video (only by the user who added it)
 */
export async function deleteEquipmentVideo(
  videoId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('equipment_videos')
      .delete()
      .eq('id', videoId)
      .eq('added_by_user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting equipment video:', error);
    return false;
  }
}

/**
 * Increment view count for a video
 */
export async function incrementVideoViewCount(videoId: string): Promise<void> {
  try {
    // Use RPC for atomic increment
    const { error } = await supabase.rpc('increment_video_view_count', {
      video_id: videoId
    });

    // If RPC doesn't exist, fall back to manual increment
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      const { data: current } = await supabase
        .from('equipment_videos')
        .select('view_count')
        .eq('id', videoId)
        .single();

      if (current) {
        await supabase
          .from('equipment_videos')
          .update({ view_count: (current.view_count || 0) + 1 })
          .eq('id', videoId);
      }
    } else if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error incrementing video view count:', error);
  }
}

/**
 * Search videos across all equipment
 */
export async function searchEquipmentVideos(
  query: string,
  limit: number = 20
): Promise<EquipmentVideo[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_videos')
      .select(`
        *,
        equipment!inner(
          brand,
          model,
          category
        ),
        added_by:profiles!added_by_user_id(
          id,
          username,
          display_name
        )
      `)
      .or(`title.ilike.%${query}%,channel.ilike.%${query}%`)
      .eq('verified', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching equipment videos:', error);
    return [];
  }
}

/**
 * Get popular videos across the platform
 */
export async function getPopularEquipmentVideos(
  limit: number = 10
): Promise<EquipmentVideoWithEngagement[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_videos')
      .select(`
        *,
        equipment!inner(
          brand,
          model,
          category,
          image_url
        ),
        added_by:profiles!added_by_user_id(
          id,
          username,
          display_name
        )
      `)
      .eq('verified', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Add engagement metrics (placeholder for now)
    return (data || []).map(video => ({
      ...video,
      likes_count: 0, // TODO: Implement video likes
      is_liked_by_user: false,
      comments_count: 0 // TODO: Implement video comments
    }));
  } catch (error) {
    console.error('Error fetching popular equipment videos:', error);
    return [];
  }
}

/**
 * Check if a video URL already exists for an equipment
 */
export async function checkVideoExists(
  equipmentId: string,
  url: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('equipment_videos')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId)
      .eq('url', url);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (error) {
    console.error('Error checking video existence:', error);
    return false;
  }
}

/**
 * Report a video for moderation
 */
export async function reportEquipmentVideo(
  videoId: string,
  reason: string,
  userId: string
): Promise<boolean> {
  try {
    // For now, just mark as unverified
    // In production, you'd want a separate reports table
    const { error } = await supabase
      .from('equipment_videos')
      .update({ verified: false })
      .eq('id', videoId);

    if (error) throw error;

    // Log the report (you'd want a proper reports table)
    console.log('Video reported:', { videoId, reason, userId });

    return true;
  } catch (error) {
    console.error('Error reporting equipment video:', error);
    return false;
  }
}

/**
 * Get video statistics for an equipment
 */
export async function getEquipmentVideoStats(equipmentId: string): Promise<{
  total_videos: number;
  total_views: number;
  top_contributor: { user_id: string; username: string; video_count: number } | null;
}> {
  try {
    const { data: videos, error } = await supabase
      .from('equipment_videos')
      .select(`
        view_count,
        added_by_user_id,
        added_by:profiles!added_by_user_id(
          username,
          display_name
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('verified', true);

    if (error) throw error;

    if (!videos || videos.length === 0) {
      return {
        total_videos: 0,
        total_views: 0,
        top_contributor: null
      };
    }

    // Calculate stats
    const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
    
    // Find top contributor
    const contributorCounts: Record<string, { count: number; username: string }> = {};
    videos.forEach(video => {
      if (video.added_by_user_id && video.added_by) {
        const userId = video.added_by_user_id;
        if (!contributorCounts[userId]) {
          contributorCounts[userId] = {
            count: 0,
            username: video.added_by.username || video.added_by.display_name || 'Unknown'
          };
        }
        contributorCounts[userId].count++;
      }
    });

    const topContributor = Object.entries(contributorCounts)
      .sort(([, a], [, b]) => b.count - a.count)[0];

    return {
      total_videos: videos.length,
      total_views: totalViews,
      top_contributor: topContributor ? {
        user_id: topContributor[0],
        username: topContributor[1].username,
        video_count: topContributor[1].count
      } : null
    };
  } catch (error) {
    console.error('Error fetching equipment video stats:', error);
    return {
      total_videos: 0,
      total_views: 0,
      top_contributor: null
    };
  }
}