import { supabase } from '@/lib/supabase';

/**
 * Hot Score Service
 * Manages hot scoring calculations and updates for feed posts and bags
 * Uses Reddit-style algorithm implemented in PostgreSQL
 */

interface HotScoreResult {
  success: boolean;
  score?: number;
  error?: string;
}

/**
 * Manually trigger hot score update for a feed post
 */
export async function updateFeedPostHotScore(postId: string): Promise<HotScoreResult> {
  try {
    // Call the PostgreSQL function to update tee counts and hot score
    const { data, error } = await supabase
      .rpc('update_feed_post_tee_counts', { post_id: postId });
    
    if (error) throw error;
    
    // Get the updated score
    const { data: post } = await supabase
      .from('feed_posts')
      .select('hot_score')
      .eq('id', postId)
      .single();
    
    return {
      success: true,
      score: post?.hot_score || 0
    };
  } catch (error) {
    console.error('Error updating feed post hot score:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manually trigger hot score update for a bag
 */
export async function updateBagHotScore(bagId: string): Promise<HotScoreResult> {
  try {
    // Call the PostgreSQL function to update tee counts and hot score
    const { data, error } = await supabase
      .rpc('update_bag_tee_counts', { bag_id: bagId });
    
    if (error) throw error;
    
    // Get the updated score
    const { data: bag } = await supabase
      .from('user_bags')
      .select('hot_score')
      .eq('id', bagId)
      .single();
    
    return {
      success: true,
      score: bag?.hot_score || 0
    };
  } catch (error) {
    console.error('Error updating bag hot score:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch update hot scores for multiple posts
 * Useful for periodic recalculation of older content
 */
export async function batchUpdateFeedHotScores(postIds: string[]): Promise<void> {
  try {
    for (const postId of postIds) {
      await updateFeedPostHotScore(postId);
    }
  } catch (error) {
    console.error('Error batch updating feed hot scores:', error);
  }
}

/**
 * Batch update hot scores for multiple bags
 */
export async function batchUpdateBagHotScores(bagIds: string[]): Promise<void> {
  try {
    for (const bagId of bagIds) {
      await updateBagHotScore(bagId);
    }
  } catch (error) {
    console.error('Error batch updating bag hot scores:', error);
  }
}

/**
 * Get posts sorted by hot score
 */
export async function getHotFeedPosts(limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          avatar_url,
          handicap
        ),
        equipment:equipment(
          id,
          brand,
          model,
          category,
          image_url
        ),
        bag:user_bags(
          id,
          name,
          description,
          background
        ),
        feed_likes(
          user_id
        )
      `)
      .order('hot_score', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting hot feed posts:', error);
    return [];
  }
}

/**
 * Get bags sorted by hot score
 */
export async function getHotBags(limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('user_bags')
      .select(`
        *,
        profiles!user_bags_user_id_fkey(
          username,
          avatar_url,
          handicap
        ),
        bag_tees(
          user_id
        )
      `)
      .eq('is_public', true)
      .order('hot_score', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting hot bags:', error);
    return [];
  }
}

/**
 * Apply boost to an equipment item (for featured/sponsored items)
 */
export async function applyEquipmentBoost(
  equipmentId: string, 
  boostFactor: number = 2.0,
  expiresInHours: number = 24
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    const { error } = await supabase
      .from('equipment')
      .update({
        boost_factor: boostFactor,
        boost_expires_at: expiresAt.toISOString()
      })
      .eq('id', equipmentId);
    
    if (error) throw error;
    
    // Update hot scores for all posts featuring this equipment
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('equipment_id', equipmentId);
    
    if (posts) {
      await batchUpdateFeedHotScores(posts.map(p => p.id));
    }
    
    return true;
  } catch (error) {
    console.error('Error applying equipment boost:', error);
    return false;
  }
}

/**
 * Remove boost from an equipment item
 */
export async function removeEquipmentBoost(equipmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('equipment')
      .update({
        boost_factor: 1.0,
        boost_expires_at: null
      })
      .eq('id', equipmentId);
    
    if (error) throw error;
    
    // Update hot scores for all posts featuring this equipment
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('equipment_id', equipmentId);
    
    if (posts) {
      await batchUpdateFeedHotScores(posts.map(p => p.id));
    }
    
    return true;
  } catch (error) {
    console.error('Error removing equipment boost:', error);
    return false;
  }
}

/**
 * Get current boost status for equipment
 */
export async function getEquipmentBoostStatus(equipmentId: string) {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('boost_factor, boost_expires_at')
      .eq('id', equipmentId)
      .single();
    
    if (error) throw error;
    
    const isActive = data?.boost_expires_at ? new Date(data.boost_expires_at) > new Date() : false;
    
    return {
      isActive,
      boostFactor: isActive ? data?.boost_factor || 1.0 : 1.0,
      expiresAt: data?.boost_expires_at
    };
  } catch (error) {
    console.error('Error getting equipment boost status:', error);
    return {
      isActive: false,
      boostFactor: 1.0,
      expiresAt: null
    };
  }
}

/**
 * Refresh hot scores for content older than specified hours
 * Useful for periodic maintenance
 */
export async function refreshOldHotScores(olderThanHours: number = 24): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
    
    // Refresh old feed posts
    const { data: oldPosts } = await supabase
      .from('feed_posts')
      .select('id')
      .lt('hot_score_updated_at', cutoffDate.toISOString())
      .limit(100);
    
    if (oldPosts) {
      await batchUpdateFeedHotScores(oldPosts.map(p => p.id));
    }
    
    // Refresh old bags
    const { data: oldBags } = await supabase
      .from('user_bags')
      .select('id')
      .lt('hot_score_updated_at', cutoffDate.toISOString())
      .limit(100);
    
    if (oldBags) {
      await batchUpdateBagHotScores(oldBags.map(b => b.id));
    }
  } catch (error) {
    console.error('Error refreshing old hot scores:', error);
  }
}

export default {
  updateFeedPostHotScore,
  updateBagHotScore,
  batchUpdateFeedHotScores,
  batchUpdateBagHotScores,
  getHotFeedPosts,
  getHotBags,
  applyEquipmentBoost,
  removeEquipmentBoost,
  getEquipmentBoostStatus,
  refreshOldHotScores
};