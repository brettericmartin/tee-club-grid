import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { executeWithRetry } from '@/lib/authHelpers';

// Define FeedPost type since it might not be in the Database interface yet
export interface FeedPost {
  id: string;
  user_id: string;
  type: 'new_equipment' | 'bag_update' | 'milestone' | 'playing' | 'equipment_photo' | 'bag_video';
  content: any; // JSONB field
  equipment_id?: string | null;
  bag_id?: string | null;
  media_urls?: string[] | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: any;
  bag?: any;
  user_liked?: any[];
}

// Helper function to find recent equipment posts
async function findRecentEquipmentPost(
  userId: string, 
  equipmentId: string, 
  hourLimit: number = 1
): Promise<FeedPost | null> {
  const recentTime = new Date();
  recentTime.setHours(recentTime.getHours() - hourLimit);

  // Look for posts with this equipment
  const result = await executeWithRetry(
    () => supabase
      .from('feed_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .gte('created_at', recentTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    { maxRetries: 1 }
  );
  
  const { data, error } = result;
  
  if (error || !data) return null;
  return data;
}

// Helper function to update existing post with photo
async function updatePostWithPhoto(
  postId: string, 
  photoUrl: string, 
  caption?: string
): Promise<FeedPost | null> {
  const existingResult = await executeWithRetry(
    () => supabase
      .from('feed_posts')
      .select('*')
      .eq('id', postId)
      .single(),
    { maxRetries: 1 }
  );
  
  const { data: existingPost } = existingResult;

  if (!existingPost) return null;

  // Update media_urls array
  const currentMediaUrls = existingPost.media_urls || [];
  const updatedMediaUrls = [...currentMediaUrls, photoUrl];
  
  // Update content with new photo and caption
  let updatedContent = existingPost.content || {};
  if (typeof updatedContent === 'object') {
    updatedContent.photos = updatedContent.photos || [];
    updatedContent.photos.push(photoUrl);
    if (caption) {
      updatedContent.caption = caption;
    }
  }

  const updateResult = await executeWithRetry(
    () => supabase
      .from('feed_posts')
      .update({
        content: updatedContent,
        media_urls: updatedMediaUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single(),
    { maxRetries: 1 }
  );
  
  const { data, error } = updateResult;

  if (error) {
    console.error('Error updating post with photo:', error);
    return null;
  }

  return data;
}

// Create a feed post when equipment photo is uploaded
export async function createEquipmentPhotoFeedPost(
  userId: string,
  equipmentId: string,
  equipmentName: string,
  photoUrl: string,
  caption?: string,
  bagId?: string
) {
  logger.debug('Creating equipment photo feed post:', { userId, equipmentId, photoUrl, bagId });
  
  try {
    // Simple approach: Always create a new feed post when a photo is uploaded
    // Since we disabled automatic posts on equipment add, this prevents duplicates
    logger.debug('Creating feed post for equipment photo');

    // No recent post found or update failed, create new post
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'equipment_photo',
        equipment_id: equipmentId,
        bag_id: bagId,
        media_urls: [photoUrl],
        content: {
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          photo_url: photoUrl,
          caption: caption || `Check out my ${equipmentName}! 📸`,
          bag_id: bagId
        },
        likes_count: 0
      })
      .select()
      .single();

    if (error) {
      logger.error('Equipment photo feed post creation failed:', error);
      throw error;
    }
    
    logger.debug('Equipment photo feed post created successfully:', data.id, 'by user:', data.user_id);
    return data;
  } catch (error) {
    logger.error('Error creating equipment photo feed post:', error);
    throw error;
  }
}

// Create a feed post when a bag is created
export async function createBagCreationPost(userId: string, bagId: string, bagName: string) {
  console.log('Creating bag creation post:', { userId, bagId, bagName });
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'bag_update',
        bag_id: bagId,
        content: {
          bag_id: bagId,
          bag_name: bagName,
          caption: `Just created a new bag setup: ${bagName}! Check it out 🏌️`,
          is_creation: true
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Feed post creation failed:', error);
      throw error;
    }
    
    console.log('Feed post created successfully:', data);
  } catch (error) {
    console.error('Error creating bag creation post:', error);
  }
}

// Create a feed post when a bag is updated
export async function createBagUpdatePost(
  userId: string, 
  bagId: string, 
  bagName: string, 
  changes: string[]
) {
  try {
    const { error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'bag_update',
        bag_id: bagId,
        content: {
          bag_id: bagId,
          bag_name: bagName,
          changes: changes,
          caption: `Updated my ${bagName} setup`
        }
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating bag update post:', error);
  }
}

// Create a feed post when equipment is added to a bag
export async function createEquipmentAddedPost(
  userId: string,
  bagId: string,
  bagName: string,
  equipmentName: string,
  equipmentId: string
) {
  try {
    console.log('Creating equipment added post with:', {
      userId,
      bagId,
      bagName,
      equipmentName,
      equipmentId
    });
    
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'new_equipment',
        equipment_id: equipmentId,
        bag_id: bagId,
        content: {
          bag_id: bagId,
          bag_name: bagName,
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          caption: `Just added ${equipmentName} to my ${bagName}! Can't wait to test it out ⛳`
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating equipment added post:', error);
      throw error;
    }
    
    console.log('Successfully created feed post:', data);
  } catch (error) {
    console.error('Error creating equipment added post:', error);
  }
}

// Create a feed post for equipment photo
export async function createEquipmentPhotoPost(
  userId: string,
  equipmentId: string,
  equipmentName: string,
  photoUrl: string,
  caption?: string
) {
  try {
    const { error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'equipment_photo',
        equipment_id: equipmentId,
        media_urls: [photoUrl],
        content: {
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          photo_url: photoUrl,
          caption: caption || `Check out my ${equipmentName}! 📸`
        }
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating equipment photo post:', error);
  }
}

// Get feed posts with following prioritization
export async function getFeedPosts(userId?: string, filter: 'all' | 'following' | 'in-my-bags' = 'all') {
  try {
    console.log('Getting feed posts with filter:', filter, 'userId:', userId);
    
    // Simplified query - fetch posts without complex joins
    // We'll handle user likes separately to avoid query failures
    const selectQuery = `
      *,
      profile:profiles!feed_posts_user_id_fkey!left(
        username,
        display_name,
        avatar_url,
        handicap,
        title
      ),
      bag:user_bags!feed_posts_bag_id_fkey!left(
        id,
        user_id,
        name,
        background_image,
        created_at,
        likes_count,
        views_count
      ),
      equipment:equipment!feed_posts_equipment_id_fkey!left(
        id,
        brand,
        model,
        category,
        image_url
      )
    `;
    
    let query = supabase
      .from('feed_posts')
      .select(selectQuery)
      .order('created_at', { ascending: false })
      .limit(20); // Reduce initial load for better performance

    // Filter based on type
    if (filter === 'following' && userId) {
      // First get the list of users the current user follows
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        query = query.in('user_id', followingIds);
      } else {
        // If not following anyone, return empty
        return [];
      }
    } else if (filter === 'in-my-bags' && userId) {
      // Get all equipment IDs from user's bags
      const { data: bagEquipment } = await supabase
        .from('bag_equipment')
        .select('equipment_id, user_bags!inner(user_id)')
        .eq('user_bags.user_id', userId);
      
      if (bagEquipment && bagEquipment.length > 0) {
        const equipmentIds = [...new Set(bagEquipment.map(be => be.equipment_id))];
        // Filter posts that reference equipment in user's bags
        query = query.in('equipment_id', equipmentIds);
      } else {
        // If no equipment in bags, return empty
        return [];
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FeedService] Error fetching feed posts:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: userId,
        filter: filter
      });
      
      // For now, return empty array on any error to prevent app crashes
      // This allows us to see what's happening in the console
      return [];
    }
    
    console.log('Fetched feed posts:', data?.length || 0, 'posts');
    
    
    // Check user likes separately if userId exists (batch query)
    let userLikes: string[] = [];
    if (userId && data && data.length > 0) {
      const postIds = data.map(p => p.id);
      const { data: likes } = await supabase
        .from('feed_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);
      
      userLikes = likes?.map(l => l.post_id) || [];
    }
    
    // Map posts with user_liked data
    const posts = data?.map(post => ({
      ...post,
      user_liked: userLikes.includes(post.id) ? [{ id: 'liked' }] : []
    })) || [];
    
    // Filter out ALL posts that don't have pictures (checking both media_urls and content.photo_url)
    const filteredPosts = posts.filter(post => {
      const hasMediaUrls = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || (post.content?.photos && post.content.photos.length > 0);
      return hasMediaUrls || hasContentPhoto;
    });
    
    console.log(`Filtered ${posts.length} posts to ${filteredPosts.length} (removed posts without any pictures)`);
    
    return filteredPosts;
  } catch (error) {
    console.error('Error fetching feed posts - Full error:', error);
    console.error('Error stack:', (error as any).stack);
    // Return empty array to prevent app crash
    return [];
  }
}

// Get feed posts by a specific user with pagination support
export async function getUserFeedPosts(userId: string, limit: number = 100, offset: number = 0, currentUserId?: string) {
  try {
    console.log('[getUserFeedPosts] Called with userId:', userId, 'limit:', limit, 'offset:', offset);
    
    if (!userId) {
      console.error('[getUserFeedPosts] No userId provided!');
      return { posts: [], totalCount: 0 };
    }
    
    // Build the select query with conditional user_liked join
    const selectQuery = currentUserId
      ? `
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url,
          handicap,
          title
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
          user_id,
          name,
          description,
          background_image,
          created_at,
          likes_count,
          views_count,
          bag_equipment(
            *,
            equipment(*)
          )
        ),
        user_liked:feed_likes!feed_likes_post_id_fkey!left(
          id
        )
      `
      : `
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url,
          handicap,
          title
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
          user_id,
          name,
          description,
          background_image,
          created_at,
          likes_count,
          views_count,
          bag_equipment(
            *,
            equipment(*)
          )
        )
      `;
    
    let query = supabase
      .from('feed_posts')
      .select(selectQuery, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // If we have a currentUserId, filter the likes join
    if (currentUserId) {
      query = query.eq('feed_likes.user_id', currentUserId);
    }
    
    const { data, error, count } = await query;

    if (error) {
      console.error('[getUserFeedPosts] Supabase error:', error);
      throw error;
    }

    console.log(`[getUserFeedPosts] Query returned ${data?.length || 0} posts for user ${userId}, total count: ${count}`);
    if (data && data.length > 0) {
      console.log('[getUserFeedPosts] Sample post types:', data.slice(0, 3).map(p => p.type));
    }
    
    // Filter out posts without pictures (checking both media_urls and content.photo_url)
    const postsWithPictures = (data || []).filter(post => {
      const hasMediaUrls = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || (post.content?.photos && post.content.photos.length > 0);
      return hasMediaUrls || hasContentPhoto;
    });
    
    console.log(`[getUserFeedPosts] Filtered to ${postsWithPictures.length} posts with pictures`);
    
    return { posts: postsWithPictures, totalCount: postsWithPictures.length };
  } catch (error) {
    console.error('Error fetching user feed posts:', error);
    return { posts: [], totalCount: 0 };
  }
}

// Check if a post is liked by the current user
export async function checkPostLiked(userId: string, postId: string) {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

// Update a feed post
export async function updateFeedPost(
  postId: string, 
  updates: { 
    caption?: string; 
    media_urls?: string[];
    content?: any;
  }
) {
  try {
    console.log('Updating feed post:', postId, updates);

    // First, get the current post to preserve existing content
    const { data: currentPost, error: fetchError } = await supabase
      .from('feed_posts')
      .select('content')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching current post:', fetchError);
      throw fetchError;
    }

    // Prepare the update object
    const updateObject: any = {};

    if (updates.caption !== undefined) {
      // Merge the new caption with existing content
      const existingContent = currentPost.content || {};
      updateObject.content = {
        ...existingContent,
        caption: updates.caption
      };
    }

    if (updates.media_urls) {
      updateObject.media_urls = updates.media_urls;
    }

    if (updates.content) {
      updateObject.content = updates.content;
    }

    // Update timestamp
    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('feed_posts')
      .update(updateObject)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('Error updating feed post:', error);
      throw error;
    }

    console.log('Feed post updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating feed post:', error);
    throw error;
  }
}

// Delete a feed post
export async function deleteFeedPost(postId: string, userId: string) {
  try {
    console.log('Deleting feed post:', postId, 'by user:', userId);

    // First verify the post belongs to the user
    const { data: post, error: fetchError } = await supabase
      .from('feed_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    if (post.user_id !== userId) {
      throw new Error('Unauthorized - cannot delete another user\'s post');
    }

    // Delete the post
    const { error } = await supabase
      .from('feed_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting feed post:', error);
      throw error;
    }

    console.log('Feed post deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting feed post:', error);
    throw error;
  }
}

// Create a feed post for a bag video
export async function createVideoFeedPost(args: {
  user_id: string;
  bag_id: string;
  provider: 'youtube' | 'tiktok' | 'vimeo' | 'other';
  video_id?: string;
  url: string;
  title?: string;
  user_bag_video_id: string;
}) {
  return supabase.from('feed_posts').insert({
    user_id: args.user_id,
    type: 'bag_video',
    bag_id: args.bag_id,
    content: args, // JSONB
    likes_count: 0
  }).select().single();
}