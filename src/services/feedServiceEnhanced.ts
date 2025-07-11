import { supabase } from '@/lib/supabase';

export type FeedPostType = 'equipment_photo' | 'bag_created' | 'bag_updated';

export interface FeedPost {
  id: string;
  user_id: string;
  type: FeedPostType;
  content?: string;
  image_url?: string;
  bag_id?: string;
  parent_post_id?: string;
  metadata?: any;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  profiles?: any;
  user_bags?: any;
  bag_equipment?: any[];
  feed_likes?: any[];
  parent_post?: FeedPost;
}

// Get all feed posts with proper joins
export async function getEnhancedFeedPosts(userId?: string, filter: 'all' | 'following' = 'all') {
  let query = supabase
    .from('feed_posts')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url,
        handicap
      ),
      equipment:equipment_id (
        id,
        brand,
        model,
        category,
        image_url
      ),
      user_bags:bag_id (
        id,
        name,
        background_image
      )
    `)
    .order('created_at', { ascending: false });

  // If following filter and user is logged in
  if (filter === 'following' && userId) {
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    const followingIds = following?.map(f => f.following_id) || [];
    if (followingIds.length > 0) {
      query = query.in('user_id', followingIds);
    }
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching feed:', error);
    return [];
  }

  return data || [];
}

// Create equipment photo post
export async function createEquipmentPhotoPost({
  userId,
  imageUrl,
  caption,
  equipmentIds = []
}: {
  userId: string;
  imageUrl: string;
  caption?: string;
  equipmentIds?: string[];
}) {
  // Create the post
  const { data: post, error: postError } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      type: 'equipment_photo',
      content: caption,
      image_url: imageUrl,
      metadata: {
        equipment_count: equipmentIds.length
      }
    })
    .select()
    .single();

  if (postError) throw postError;

  // Tag equipment if provided
  if (equipmentIds.length > 0) {
    const tags = equipmentIds.map(equipmentId => ({
      post_id: post.id,
      equipment_id: equipmentId
    }));

    await supabase
      .from('feed_equipment_tags')
      .insert(tags);
  }

  return post;
}

// Check if bag should create new post or update existing
export async function checkBagUpdateEligibility(bagId: string) {
  // Get the bag and its creation post
  const { data: bag } = await supabase
    .from('user_bags')
    .select('created_at')
    .eq('id', bagId)
    .single();

  if (!bag) return { shouldPrompt: false, canUpdate: false };

  // Calculate hours since creation
  const hoursSinceCreation = (Date.now() - new Date(bag.created_at).getTime()) / (1000 * 60 * 60);

  // Get the original bag creation post
  const { data: originalPost } = await supabase
    .from('feed_posts')
    .select('id')
    .eq('bag_id', bagId)
    .eq('type', 'bag_created')
    .single();

  return {
    shouldPrompt: hoursSinceCreation > 72,
    canUpdate: hoursSinceCreation <= 72 && !!originalPost,
    originalPostId: originalPost?.id,
    hoursSinceCreation
  };
}

// Get recent bag updates (for prompting user)
export async function getRecentBagUpdates(bagId: string, since?: Date) {
  const query = supabase
    .from('bag_updates')
    .select(`
      *,
      equipment (*)
    `)
    .eq('bag_id', bagId)
    .order('created_at', { ascending: false });

  if (since) {
    query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching bag updates:', error);
    return [];
  }

  return data || [];
}

// Create bag update post
export async function createBagUpdatePost({
  userId,
  bagId,
  updates,
  message
}: {
  userId: string;
  bagId: string;
  updates: any[];
  message?: string;
}) {
  // Group updates by type
  const added = updates.filter(u => u.update_type === 'added');
  const removed = updates.filter(u => u.update_type === 'removed');

  // Create metadata
  const metadata = {
    added_count: added.length,
    removed_count: removed.length,
    added_equipment: added.map(u => ({
      id: u.equipment.id,
      brand: u.equipment.brand,
      model: u.equipment.model,
      category: u.equipment.category
    })),
    removed_equipment: removed.map(u => ({
      id: u.equipment.id,
      brand: u.equipment.brand,
      model: u.equipment.model,
      category: u.equipment.category
    }))
  };

  // Generate automatic message if not provided
  if (!message) {
    const parts = [];
    if (added.length > 0) {
      const firstAdded = added[0].equipment;
      parts.push(`added ${firstAdded.brand} ${firstAdded.model}`);
      if (added.length > 1) {
        parts.push(`and ${added.length - 1} more item${added.length > 2 ? 's' : ''}`);
      }
    }
    if (removed.length > 0) {
      if (parts.length > 0) parts.push('and');
      parts.push(`removed ${removed.length} item${removed.length > 1 ? 's' : ''}`);
    }
    message = parts.join(' ');
  }

  const { data: post, error } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      type: 'bag_updated',
      bag_id: bagId,
      content: message,
      metadata
    })
    .select()
    .single();

  if (error) throw error;

  return post;
}

// Create bag equipment photo post
export async function createBagEquipmentPhotoPost({
  userId,
  bagId,
  equipmentId,
  photoUrl,
  caption
}: {
  userId: string;
  bagId: string;
  equipmentId: string;
  photoUrl: string;
  caption?: string;
}) {
  const { data: post, error } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      type: 'equipment_photo',
      bag_id: bagId,
      equipment_id: equipmentId,
      content: caption || 'Shared equipment photo',
      media_urls: [photoUrl]
    })
    .select()
    .single();

  if (error) throw error;

  return post;
}

// Update existing bag post (within 72 hours)
export async function updateBagCreationPost(postId: string) {
  const { error } = await supabase
    .from('feed_posts')
    .update({
      updated_at: new Date().toISOString(),
      metadata: supabase.sql`
        jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{last_equipment_update}',
          to_jsonb(now())
        )
      `
    })
    .eq('id', postId);

  if (error) throw error;
}

// Toggle like on feed post
export async function toggleFeedLike(postId: string, userId: string) {
  // Check if already liked
  const { data: existing } = await supabase
    .from('feed_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('feed_likes')
      .delete()
      .eq('id', existing.id);
    
    if (error) throw error;
    return false;
  } else {
    // Like
    const { error } = await supabase
      .from('feed_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });
    
    if (error) throw error;
    return true;
  }
}