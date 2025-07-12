import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type FeedPost = Database['public']['Tables']['feed_posts']['Row'];

// Create a feed post when equipment photo is uploaded
export async function createEquipmentPhotoFeedPost(
  userId: string,
  equipmentId: string,
  equipmentName: string,
  photoUrl: string,
  caption?: string,
  bagId?: string
) {
  console.log('Creating equipment photo feed post:', { userId, equipmentId, photoUrl });
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'equipment_photo',
        equipment_id: equipmentId,
        bag_id: bagId,
        media_urls: [photoUrl],
        content: caption || `Check out my ${equipmentName}! 📸`,
        likes_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Equipment photo feed post creation failed:', error);
      throw error;
    }
    
    console.log('Equipment photo feed post created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating equipment photo feed post:', error);
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
        type: 'bag_update', // Using bag_update type with special content
        content: {
          bag_id: bagId,
          bag_name: `Created a new bag: ${bagName}`,
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
export async function getFeedPosts(userId?: string, filter: 'all' | 'following' = 'all') {
  try {
    console.log('Getting feed posts with filter:', filter, 'userId:', userId);
    
    let query = supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          avatar_url,
          handicap
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // If filtering by following, join with follows table
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
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feed posts from Supabase:', error);
      throw error;
    }
    
    console.log('Fetched feed posts:', data?.length || 0, 'posts');
    
    // For posts with bag_id, fetch the bag data separately
    const postsWithBags = await Promise.all((data || []).map(async (post) => {
      if (post.content?.bag_id) {
        const { data: bagData } = await supabase
          .from('user_bags')
          .select(`
            id,
            name,
            description,
            background_image,
            bag_equipment(
              equipment(
                brand,
                model,
                category,
                msrp
              )
            )
          `)
          .eq('id', post.content.bag_id)
          .single();
        
        return { ...post, bag: bagData };
      }
      return post;
    }));
    
    return postsWithBags;
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    return [];
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