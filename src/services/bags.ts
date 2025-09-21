import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { retryQuery } from '@/utils/supabaseQuery';
import { executeWithRetry } from '@/lib/authHelpers';
import { processEquipmentPhotos } from '@/utils/equipmentPhotos';
import { getBestEquipmentPhoto } from '@/services/unifiedPhotoService';

type UserBag = Database['public']['Tables']['user_bags']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'];
type Equipment = Database['public']['Tables']['equipment']['Row'];

// Get all bags for browsing
export async function getBags(options?: {
  sortBy?: 'trending' | 'newest' | 'most-liked' | 'following' | 'hot';
  handicapRange?: [number, number];
  priceRange?: [number, number];
  userId?: string;
}) {
  let query = supabase
    .from('user_bags')
    .select(`
      id,
      name,
      bag_type,
      background_image,
      description,
      created_at,
      updated_at,
      likes_count,
      views_count,
      user_id,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        handicap,
        location,
        title
      ),
      bag_equipment (
        id,
        position,
        custom_photo_url,
        purchase_price,
        is_featured,
        equipment_id,
        created_at,
        equipment:equipment (
          id,
          brand,
          model,
          category,
          image_url,
          msrp,
          equipment_photos (
            id,
            photo_url,
            likes_count,
            is_primary
          )
        )
      )
    `);
  // All bags are public

  // Apply filters
  if (options?.userId && options.sortBy === 'following') {
    // Get bags from users that the current user follows
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', options.userId);
    
    if (following) {
      const followingIds = following.map(f => f.following_id);
      query = query.in('user_id', followingIds);
    }
  }

  // Sort options
  switch (options?.sortBy) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'hot':
      query = query.order('hot_score', { ascending: false, nullsFirst: false });
      break;
    case 'most-liked':
      query = query.order('tees_count', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Execute query with proper error handling and auth retry
  const result = await executeWithRetry(
    () => query,
    {
      maxRetries: 1,
      fallbackFn: async () => {
        // Fallback to simpler query without auth if session expired
        console.log('[Bags Service] Using fallback query for anonymous access');
        return await supabase
          .from('user_bags')
          .select('*')
          .order('created_at', { ascending: false });
      }
    }
  );
  
  let { data, error } = result;
  
  // If there's still an error with the query, try a simpler version
  if (error) {
    console.warn('[Bags Service] Error with main query, trying simpler fallback:', error);
    
    // Try a simpler query without nested selects
    const fallbackResult = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        bag_type,
        background_image,
        description,
        created_at,
        updated_at,
        likes_count,
        views_count,
        user_id,
        profiles!left (
          id,
          username,
          display_name,
          avatar_url,
          handicap,
          location,
          title
        ),
        bag_equipment!left (
          id,
          position,
          custom_photo_url,
          purchase_price,
          is_featured,
          equipment_id,
          equipment:equipment!left (
            id,
            brand,
            model,
            category,
            image_url,
            msrp,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        )
      `);
    
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  
  if (error) {
    console.error('Error fetching bags:', error);
    throw error;
  }
  
  // Process the data to add primaryPhoto to equipment
  const processedData = data?.map(bag => {
    // Use shared utility to process equipment photos
    const processedEquipment = processEquipmentPhotos(bag.bag_equipment || []);
    
    return {
      ...bag,
      bag_equipment: processedEquipment,
      totalValue: processedEquipment.reduce((sum, item) => 
        sum + (item.purchase_price || item.equipment?.msrp || 0), 0
      ) || 0,
      likesCount: bag.likes_count || 0
    };
  }) || [];
  
  return processedData;
}

// Get a bag by ID (for feed cards)
export async function getBagById(bagId: string) {
  const { data, error } = await supabase
    .from('user_bags')
    .select(`
      id,
      name,
      bag_type,
      background_image,
      description,
      created_at,
      updated_at,
      likes_count,
      views_count,
      user_id,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        handicap,
        location,
        title
      ),
      bag_equipment (
        id,
        position,
        custom_photo_url,
        purchase_price,
        is_featured,
        equipment_id,
        created_at,
        equipment:equipment (
          id,
          brand,
          model,
          category,
          image_url,
          msrp,
          equipment_photos (
            id,
            photo_url,
            likes_count,
            is_primary
          )
        )
      )
    `)
    .eq('id', bagId)
    .single();

  if (error) throw error;
  
  // Use the same processing as getBags to ensure consistency
  const processedEquipment = processEquipmentPhotos(data.bag_equipment || []);
  
  return {
    ...data,
    bag_equipment: processedEquipment,
    totalValue: processedEquipment.reduce((sum, item) => 
      sum + (item.purchase_price || item.equipment?.msrp || 0), 0
    ) || 0,
    likesCount: data.likes_count || 0
  };
}

// Get a specific user's bag
export async function getUserBag(username: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (!profile) throw new Error('User not found');

  const { data, error } = await supabase
    .from('user_bags')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        handicap,
        location,
        bio,
        title
      ),
      bag_equipment (
        *,
        equipment:equipment (
          *,
          equipment_photos (
            id,
            photo_url,
            likes_count,
            is_primary
          )
        )
      ),
      bag_likes (count)
    `)
    .eq('user_id', profile.id)
    .single();

  if (error) throw error;
  
  // Process equipment to set primaryPhoto using unified photo service
  if (data && data.bag_equipment) {
    data.bag_equipment = data.bag_equipment.map(item => {
      if (item.equipment) {
        // Use unified photo service for consistent photo selection
        item.equipment.primaryPhoto = getBestEquipmentPhoto(item.equipment, item.custom_photo_url);
      }
      return item;
    });
  }
  
  return data;
}

// Get current user's bag
export async function getMyBag(userId: string) {
  const data = await retryQuery(async () => {
    return await supabase
      .from('user_bags')
      .select(`
        *,
        bag_equipment (
          *,
          equipment:equipment (
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        )
      `)
      .eq('user_id', userId)
      .single();
  });

  // Process equipment to set primaryPhoto using unified photo service
  if (data && data.bag_equipment) {
    data.bag_equipment = data.bag_equipment.map(item => {
      if (item.equipment) {
        // Use unified photo service for consistent photo selection
        item.equipment.primaryPhoto = getBestEquipmentPhoto(item.equipment, item.custom_photo_url);
      }
      return item;
    });
  }
  
  return data;
}

// Create a new bag for user
export async function createBag(userId: string, name: string = "My Bag") {
  const { data, error } = await supabase
    .from('user_bags')
    .insert({
      user_id: userId,
      name
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update bag details
export async function updateBag(bagId: string, updates: {
  name?: string;
  description?: string;
  background_image?: string;
}) {
  const { data, error } = await supabase
    .from('user_bags')
    .update(updates)
    .eq('id', bagId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Check if exact duplicate equipment exists (same equipment with identical specs)
export async function checkEquipmentDuplicate(
  bagId: string, 
  equipmentId: string, 
  details?: {
    shaft_id?: string;
    grip_id?: string;
    custom_specs?: Record<string, any>;
  }
): Promise<boolean> {
  // Get existing equipment in bag
  const { data: existing } = await supabase
    .from('bag_equipment')
    .select('*')
    .eq('bag_id', bagId)
    .eq('equipment_id', equipmentId);

  if (!existing || existing.length === 0) return false;

  // Check if any existing entry has identical specs
  return existing.some(item => {
    const sameShaft = (item.shaft_id === (details?.shaft_id || null));
    const sameGrip = (item.grip_id === (details?.grip_id || null));
    
    // Deep compare custom_specs
    const existingSpecs = item.custom_specs || {};
    const newSpecs = details?.custom_specs || {};
    
    // Check if loft is the same
    const sameLoft = existingSpecs.loft === newSpecs.loft;
    
    // Check if all specs match
    const sameSpecs = JSON.stringify(existingSpecs) === JSON.stringify(newSpecs);
    
    return sameShaft && sameGrip && sameSpecs;
  });
}

// Get equipment variants in bag (same equipment with different specs)
export async function getEquipmentVariants(bagId: string, equipmentId: string) {
  const { data, error } = await supabase
    .from('bag_equipment')
    .select(`
      *,
      equipment:equipment (
        *,
        equipment_photos (
          id,
          photo_url,
          likes_count,
          is_primary
        )
      ),
      shaft:shaft_id (*),
      grip:grip_id (*)
    `)
    .eq('bag_id', bagId)
    .eq('equipment_id', equipmentId)
    .order('created_at');

  if (error) throw error;
  
  return data?.map((item, index) => ({
    ...item,
    variant_number: index + 1,
    variant_label: item.custom_specs?.loft ? `${item.custom_specs.loft}` : null
  })) || [];
}

// Add equipment to bag
export async function addEquipmentToBag(bagId: string, equipmentId: string, details?: {
  is_featured?: boolean;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  custom_specs?: Record<string, any>;
  shaft_id?: string;
  grip_id?: string;
}) {
  // Check for exact duplicate (same equipment with identical specs)
  const isDuplicate = await checkEquipmentDuplicate(bagId, equipmentId, {
    shaft_id: details?.shaft_id,
    grip_id: details?.grip_id,
    custom_specs: details?.custom_specs
  });
  
  if (isDuplicate) {
    throw new Error('This exact equipment configuration already exists in your bag. You can add the same equipment with different specifications (loft, shaft, grip, etc).');
  }

  const { data, error } = await supabase
    .from('bag_equipment')
    .insert({
      bag_id: bagId,
      equipment_id: equipmentId,
      ...details
    })
    .select(`
      *,
      equipment:equipment (*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Update equipment in bag
export async function updateBagEquipment(bagEquipmentId: string, updates: {
  is_featured?: boolean;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  custom_specs?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('bag_equipment')
    .update(updates)
    .eq('id', bagEquipmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove equipment from bag
export async function removeEquipmentFromBag(bagEquipmentId: string) {
  const { error } = await supabase
    .from('bag_equipment')
    .delete()
    .eq('id', bagEquipmentId);

  if (error) throw error;
}

// Like/unlike a bag
export async function toggleBagLike(userId: string, bagId: string) {
  // Check if already liked
  const { data: existing } = await supabase
    .from('bag_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('bag_id', bagId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('bag_likes')
      .delete()
      .eq('id', existing.id);
    
    if (error) throw error;
    return false; // unliked
  } else {
    // Like
    const { error } = await supabase
      .from('bag_likes')
      .insert({
        user_id: userId,
        bag_id: bagId
      });
    
    if (error) throw error;
    return true; // liked
  }
}

// Check if user has liked a bag
export async function hasUserLikedBag(userId: string, bagId: string) {
  const { data } = await supabase
    .from('bag_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('bag_id', bagId)
    .single();

  return !!data;
}

// Set a bag as the primary bag for a user
export async function setPrimaryBag(userId: string, bagId: string) {
  // Step 1: First unset all bags as primary for this user
  const { error: unsetError } = await supabase
    .from('user_bags')
    .update({ is_primary: false })
    .eq('user_id', userId);
  
  if (unsetError) {
    console.error('Error unsetting primary bags:', unsetError);
    throw unsetError;
  }
  
  // Step 2: Set the selected bag as primary
  const { error: setError } = await supabase
    .from('user_bags')
    .update({ is_primary: true })
    .eq('id', bagId)
    .eq('user_id', userId);

  if (setError) {
    console.error('Error setting primary bag:', setError);
    throw setError;
  }
  
  // Step 3: Return the updated bag
  const { data, error } = await supabase
    .from('user_bags')
    .select()
    .eq('id', bagId)
    .single();
    
  if (error) throw error;
  return data;
}

// Get user's primary bag
export async function getUserPrimaryBag(userId: string) {
  const { data, error } = await supabase
    .from('user_bags')
    .select(`
      *,
      bag_equipment (
        id,
        position,
        custom_photo_url,
        purchase_price,
        is_featured,
        equipment:equipment (
          id,
          brand,
          model,
          category,
          image_url,
          msrp
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw error;
  }
  
  return data;
}

// Get all user bags with primary status
export async function getUserBags(userId: string) {
  const { data, error } = await supabase
    .from('user_bags')
    .select(`
      id,
      name,
      bag_type,
      is_primary,
      description,
      background_image,
      created_at,
      updated_at,
      likes_count,
      views_count,
      bag_equipment (count)
    `)
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Delete a bag and all its equipment
export async function deleteBag(bagId: string, userId: string) {
  // First check if this is the user's only bag
  const { data: userBags, error: countError } = await supabase
    .from('user_bags')
    .select('id, is_primary')
    .eq('user_id', userId);
    
  if (countError) throw countError;
  
  if (!userBags || userBags.length === 0) {
    throw new Error('No bags found');
  }
  
  if (userBags.length === 1) {
    throw new Error('Cannot delete your only bag. Create another bag first.');
  }
  
  // Find the bag to delete
  const bagToDelete = userBags.find(b => b.id === bagId);
  if (!bagToDelete) {
    throw new Error('Bag not found');
  }
  
  // If we're deleting the primary bag, we need to set another as primary
  if (bagToDelete.is_primary) {
    const otherBag = userBags.find(b => b.id !== bagId);
    if (otherBag) {
      await setPrimaryBag(userId, otherBag.id);
    }
  }
  
  // Delete all equipment associations first (due to foreign key constraints)
  const { error: equipmentError } = await supabase
    .from('bag_equipment')
    .delete()
    .eq('bag_id', bagId);
    
  if (equipmentError) throw equipmentError;
  
  // Now delete the bag
  const { error: deleteError } = await supabase
    .from('user_bags')
    .delete()
    .eq('id', bagId)
    .eq('user_id', userId); // Extra safety check
    
  if (deleteError) throw deleteError;
  
  return true;
}