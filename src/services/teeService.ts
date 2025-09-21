import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Centralized Tee Service
 * Handles all tee/like operations across the platform
 */

// Types
interface TeeResult {
  success: boolean;
  isLiked: boolean;
  count?: number;
  error?: string;
}

interface AggregatedTees {
  bagTees: number;
  photoTees: number;
  totalTees: number;
}

// Utility function to check if user is authenticated
const requireAuth = () => {
  const userId = supabase.auth.getUser();
  if (!userId) {
    toast.error('Please sign in to tee content');
    return null;
  }
  return userId;
};

/**
 * Toggle tee/like on a bag
 */
export async function toggleBagTee(bagId: string, userId?: string): Promise<TeeResult> {
  try {
    // Get current user if not provided
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) {
      return { success: false, isLiked: false, error: 'User not authenticated' };
    }

    // Check if already teed
    const { data: existing } = await supabase
      .from('bag_tees')
      .select('id')
      .eq('bag_id', bagId)
      .eq('user_id', actualUserId)
      .single();

    if (existing) {
      // Untee
      const { error } = await supabase
        .from('bag_tees')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      
      return { success: true, isLiked: false };
    } else {
      // Tee
      const { error } = await supabase
        .from('bag_tees')
        .insert({
          bag_id: bagId,
          user_id: actualUserId
        });
      
      if (error) throw error;
      
      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error('Error toggling bag tee:', error);
    return { success: false, isLiked: false, error: error.message };
  }
}

/**
 * Toggle tee/like on a feed post
 */
export async function toggleFeedTee(postId: string, userId?: string): Promise<TeeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) {
      return { success: false, isLiked: false, error: 'User not authenticated' };
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('feed_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', actualUserId)
      .single();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('feed_likes')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      
      return { success: true, isLiked: false };
    } else {
      // Like
      const { error } = await supabase
        .from('feed_likes')
        .insert({
          post_id: postId,
          user_id: actualUserId
        });
      
      if (error) throw error;
      
      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error('Error toggling feed tee:', error);
    return { success: false, isLiked: false, error: error.message };
  }
}

/**
 * Toggle tee/like on an equipment photo
 */
export async function togglePhotoTee(photoId: string, userId?: string): Promise<TeeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) {
      return { success: false, isLiked: false, error: 'User not authenticated' };
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('equipment_photo_likes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('user_id', actualUserId)
      .single();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('equipment_photo_likes')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      
      return { success: true, isLiked: false };
    } else {
      // Like
      const { error } = await supabase
        .from('equipment_photo_likes')
        .insert({
          photo_id: photoId,
          user_id: actualUserId
        });
      
      if (error) throw error;
      
      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error('Error toggling photo tee:', error);
    return { success: false, isLiked: false, error: error.message };
  }
}

/**
 * Toggle tee/like on a comment
 */
export async function toggleCommentTee(commentId: string, userId?: string): Promise<TeeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) {
      return { success: false, isLiked: false, error: 'User not authenticated' };
    }

    // For now, comments don't have a likes table, so we'll return success
    // This can be implemented when comment likes are added
    console.log('Comment tees not yet implemented');
    return { success: true, isLiked: false };
  } catch (error) {
    console.error('Error toggling comment tee:', error);
    return { success: false, isLiked: false, error: error.message };
  }
}

/**
 * Get total tees for a bag (including all equipment photos)
 */
export async function getBagTotalTees(bagId: string): Promise<AggregatedTees> {
  try {
    // Get bag tees
    const { data: bagTees, error: bagError } = await supabase
      .from('bag_tees')
      .select('id', { count: 'exact' })
      .eq('bag_id', bagId);
    
    if (bagError) throw bagError;

    // Get photo tees for equipment in this bag
    const { data: photoTees, error: photoError } = await supabase
      .from('bag_equipment')
      .select(`
        equipment_id,
        equipment:equipment_id (
          equipment_photos (
            equipment_photo_likes (
              id
            )
          )
        )
      `)
      .eq('bag_id', bagId);
    
    if (photoError) throw photoError;

    // Count photo tees
    let photoTeeCount = 0;
    photoTees?.forEach(item => {
      item.equipment?.equipment_photos?.forEach(photo => {
        photoTeeCount += photo.equipment_photo_likes?.length || 0;
      });
    });

    return {
      bagTees: bagTees?.length || 0,
      photoTees: photoTeeCount,
      totalTees: (bagTees?.length || 0) + photoTeeCount
    };
  } catch (error) {
    console.error('Error getting bag total tees:', error);
    return { bagTees: 0, photoTees: 0, totalTees: 0 };
  }
}

/**
 * Get total tees received by a user across all content
 * This is the comprehensive aggregation function that counts ALL tees
 */
export async function getUserTotalTees(userId: string): Promise<{
  bagTees: number;
  postTees: number;
  photoTees: number;
  equipmentTees: number;
  totalTees: number;
}> {
  try {
    console.log('[getUserTotalTees] Starting for user:', userId);
    
    // 1. Count tees on user's bags (other users teeing this user's bags)
    const { data: userBags } = await supabase
      .from('user_bags')
      .select('id')
      .eq('user_id', userId);
    
    let bagTees = 0;
    if (userBags && userBags.length > 0) {
      const bagIds = userBags.map(bag => bag.id);
      const { count: bagCount } = await supabase
        .from('bag_tees')
        .select('*', { count: 'exact', head: true })
        .in('bag_id', bagIds);
      bagTees = bagCount || 0;
    }
    
    // 2. Count tees on user's feed posts
    const { data: userPosts } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('user_id', userId);
    
    let postTees = 0;
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(post => post.id);
      // Check both 'likes' and 'feed_likes' tables for compatibility
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);
      
      const { count: feedLikesCount } = await supabase
        .from('feed_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);
      
      postTees = (likesCount || 0) + (feedLikesCount || 0);
    }
    
    // 3. Count tees on user's equipment photos
    const { data: userPhotos } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('user_id', userId);
    
    let photoTees = 0;
    if (userPhotos && userPhotos.length > 0) {
      const photoIds = userPhotos.map(photo => photo.id);
      const { count: photoCount } = await supabase
        .from('equipment_photo_likes')
        .select('*', { count: 'exact', head: true })
        .in('photo_id', photoIds);
      photoTees = photoCount || 0;
    }
    
    // 4. Count tees on equipment added by this user
    const { data: userEquipment } = await supabase
      .from('equipment')
      .select('id')
      .eq('added_by_user_id', userId);
    
    let equipmentTees = 0;
    if (userEquipment && userEquipment.length > 0) {
      const equipmentIds = userEquipment.map(eq => eq.id);
      const { count: equipmentCount } = await supabase
        .from('equipment_tees')
        .select('*', { count: 'exact', head: true })
        .in('equipment_id', equipmentIds);
      equipmentTees = equipmentCount || 0;
    }
    
    const totalTees = bagTees + postTees + photoTees + equipmentTees;
    
    console.log('[getUserTotalTees] Results:', {
      bagTees,
      postTees,
      photoTees,
      equipmentTees,
      totalTees
    });
    
    return {
      bagTees,
      postTees,
      photoTees,
      equipmentTees,
      totalTees
    };
  } catch (error) {
    console.error('[getUserTotalTees] Error:', error);
    return {
      bagTees: 0,
      postTees: 0,
      photoTees: 0,
      equipmentTees: 0,
      totalTees: 0
    };
  }
}

/**
 * Get all items teed by a user
 */
export async function getUserTeedItems(
  userId: string, 
  type: 'bags' | 'posts' | 'photos' | 'all' = 'all'
): Promise<any> {
  try {
    const results: any = {};

    if (type === 'bags' || type === 'all') {
      const { data: bags } = await supabase
        .from('bag_tees')
        .select('bag_id, created_at')
        .eq('user_id', userId);
      results.bags = bags || [];
    }

    if (type === 'posts' || type === 'all') {
      const { data: posts } = await supabase
        .from('feed_likes')
        .select('post_id, created_at')
        .eq('user_id', userId);
      results.posts = posts || [];
    }

    if (type === 'photos' || type === 'all') {
      const { data: photos } = await supabase
        .from('equipment_photo_likes')
        .select('photo_id, created_at')
        .eq('user_id', userId);
      results.photos = photos || [];
    }

    return results;
  } catch (error) {
    console.error('Error getting user teed items:', error);
    return {};
  }
}

/**
 * Check if a user has teed an item
 */
export async function checkUserTeed(
  itemId: string,
  itemType: 'bag' | 'post' | 'photo',
  userId?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) return false;

    let table = '';
    let column = '';
    
    switch (itemType) {
      case 'bag':
        table = 'bag_tees';
        column = 'bag_id';
        break;
      case 'post':
        table = 'feed_likes';
        column = 'post_id';
        break;
      case 'photo':
        table = 'equipment_photo_likes';
        column = 'photo_id';
        break;
    }

    const { data } = await supabase
      .from(table)
      .select('id')
      .eq(column, itemId)
      .eq('user_id', actualUserId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Get tee count for an item
 */
export async function getTeeCount(
  itemId: string,
  itemType: 'bag' | 'post' | 'photo'
): Promise<number> {
  try {
    let table = '';
    let column = '';
    
    switch (itemType) {
      case 'bag':
        table = 'bag_tees';
        column = 'bag_id';
        break;
      case 'post':
        table = 'feed_likes';
        column = 'post_id';
        break;
      case 'photo':
        table = 'equipment_photo_likes';
        column = 'photo_id';
        break;
    }

    const { data, count } = await supabase
      .from(table)
      .select('id', { count: 'exact' })
      .eq(column, itemId);

    return count || 0;
  } catch (error) {
    console.error('Error getting tee count:', error);
    return 0;
  }
}

/**
 * Batch check if user has teed multiple items
 */
export async function batchCheckUserTeed(
  items: Array<{ id: string; type: 'bag' | 'post' | 'photo' }>,
  userId?: string
): Promise<Record<string, boolean>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actualUserId = userId || user?.id;
    
    if (!actualUserId) {
      return items.reduce((acc, item) => ({ ...acc, [item.id]: false }), {});
    }

    const results: Record<string, boolean> = {};

    // Group items by type for efficient querying
    const bagIds = items.filter(i => i.type === 'bag').map(i => i.id);
    const postIds = items.filter(i => i.type === 'post').map(i => i.id);
    const photoIds = items.filter(i => i.type === 'photo').map(i => i.id);

    // Query bags
    if (bagIds.length > 0) {
      const { data: bagTees } = await supabase
        .from('bag_tees')
        .select('bag_id')
        .in('bag_id', bagIds)
        .eq('user_id', actualUserId);
      
      bagIds.forEach(id => {
        results[id] = bagTees?.some(t => t.bag_id === id) || false;
      });
    }

    // Query posts
    if (postIds.length > 0) {
      const { data: postLikes } = await supabase
        .from('feed_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', actualUserId);
      
      postIds.forEach(id => {
        results[id] = postLikes?.some(l => l.post_id === id) || false;
      });
    }

    // Query photos
    if (photoIds.length > 0) {
      const { data: photoLikes } = await supabase
        .from('equipment_photo_likes')
        .select('photo_id')
        .in('photo_id', photoIds)
        .eq('user_id', actualUserId);
      
      photoIds.forEach(id => {
        results[id] = photoLikes?.some(l => l.photo_id === id) || false;
      });
    }

    return results;
  } catch (error) {
    console.error('Error batch checking user tees:', error);
    return items.reduce((acc, item) => ({ ...acc, [item.id]: false }), {});
  }
}

// Export all functions as default object as well
export default {
  toggleBagTee,
  toggleFeedTee,
  togglePhotoTee,
  toggleCommentTee,
  getBagTotalTees,
  getUserTeedItems,
  checkUserTeed,
  getTeeCount,
  batchCheckUserTeed
};