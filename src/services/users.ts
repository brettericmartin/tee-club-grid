import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Get user profile
export async function getUserProfile(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_bags (count),
      equipment_reviews (count),
      equipment_photos (count),
      followers:user_follows!user_follows_following_id_fkey (count),
      following:user_follows!user_follows_follower_id_fkey (count)
    `)
    .eq('username', username)
    .single();

  if (error) throw error;
  
  return {
    ...data,
    stats: {
      bagsCount: data.user_bags?.[0]?.count || 0,
      reviewsCount: data.equipment_reviews?.[0]?.count || 0,
      photosCount: data.equipment_photos?.[0]?.count || 0,
      followersCount: data.followers?.[0]?.count || 0,
      followingCount: data.following?.[0]?.count || 0
    }
  };
}

// Update user profile
export async function updateUserProfile(userId: string, updates: {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  handicap?: number;
  location?: string;
  bio?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Follow/unfollow user
export async function toggleFollow(followerId: string, followingId: string) {
  console.log('toggleFollow called with:', { followerId, followingId });
  
  try {
    // Check if already following
    const { data: existing, error: checkError } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking follow status:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('Unfollowing user...');
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error unfollowing:', error);
        throw error;
      }
      console.log('Successfully unfollowed');
      return false; // unfollowed
    } else {
      console.log('Following user...');
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        });
      
      if (error) {
        console.error('Error following:', error);
        throw error;
      }
      console.log('Successfully followed');
      return true; // followed
    }
  } catch (error) {
    console.error('toggleFollow error:', error);
    throw error;
  }
}

// Check if user follows another user
export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();

  return !!data;
}

// Get user's followers
export async function getUserFollowers(userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select(`
      *,
      follower:profiles!user_follows_follower_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        handicap
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map(f => f.follower);
}

// Get users that a user follows
export async function getUserFollowing(userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select(`
      *,
      following:profiles!user_follows_following_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        handicap
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map(f => f.following);
}

// Get followed bags
export async function getFollowedBags(userId: string) {
  // First get who the user follows
  const { data: following } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (!following?.length) return [];

  const followingIds = following.map(f => f.following_id);

  // Then get their bags
  const { data, error } = await supabase
    .from('user_bags')
    .select(`
      *,
      profile:profiles!user_bags_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        handicap
      ),
      bag_equipment (
        equipment:equipment (
          brand,
          model,
          category,
          msrp
        ),
        purchase_price
      ),
      bag_likes (count)
    `)
    .in('user_id', followingIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(bag => ({
    ...bag,
    totalValue: bag.bag_equipment?.reduce((sum, item) => 
      sum + (item.purchase_price || item.equipment?.msrp || 0), 0
    ) || 0,
    likesCount: bag.bag_likes?.[0]?.count || 0
  }));
}

// Upload avatar
export async function uploadAvatar(userId: string, file: File) {
  // Upload to Supabase Storage
  const fileName = `${userId}/${Date.now()}-avatar`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('user-avatars')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('user-avatars')
    .getPublicUrl(fileName);

  // Update profile
  const { data, error } = await updateUserProfile(userId, {
    avatar_url: publicUrl
  });

  if (error) throw error;
  return publicUrl;
}

// Search users
export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, handicap')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
}