import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { getTopBagsWithEquipment } from './equipmentBags';
import { getBestEquipmentPhoto } from './unifiedPhotoService';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type EquipmentReview = Database['public']['Tables']['equipment_reviews']['Row'];
type EquipmentPhoto = Database['public']['Tables']['equipment_photos']['Row'];

// Get all equipment with filters
export async function getEquipment(options?: {
  category?: string;
  sortBy?: 'popular' | 'newest' | 'price-low' | 'price-high';
  search?: string;
}) {
  // Include equipment_photos in the query for proper photo display
  let query = supabase
    .from('equipment')
    .select(`
      *,
      equipment_photos (
        id,
        photo_url,
        likes_count,
        is_primary
      )
    `);

  // Apply filters
  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    // Sanitize search input to prevent SQL injection
    const sanitizedSearch = options.search.replace(/[%_]/g, '\\$&');
    query = query.or(`brand.ilike.%${sanitizedSearch}%,model.ilike.%${sanitizedSearch}%`);
  }

  // Sort options
  switch (options?.sortBy) {
    case 'popular':
      query = query.order('popularity_score', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'price-low':
      query = query.order('msrp', { ascending: true });
      break;
    case 'price-high':
      query = query.order('msrp', { ascending: false });
      break;
    default:
      query = query.order('popularity_score', { ascending: false });
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('[EquipmentService] Error fetching equipment:', error);
    
    // Check for auth/session errors and retry
    if (error.message?.includes('JWT') || error.message?.includes('token') || error.code === 'PGRST301') {
      console.log('[EquipmentService] Auth error detected, attempting to refresh...');
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.log('[EquipmentService] Session refresh failed, trying anonymous access');
        // Try without auth context for public data
        const anonymousQuery = supabase
          .from('equipment')
          .select(`
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          `);
        
        // Reapply filters
        if (options?.category && options.category !== 'all') {
          anonymousQuery.eq('category', options.category);
        }
        if (options?.search) {
          const sanitizedSearch = options.search.replace(/[%_]/g, '\\$&');
          anonymousQuery.or(`brand.ilike.%${sanitizedSearch}%,model.ilike.%${sanitizedSearch}%`);
        }
        
        // Reapply sorting
        switch (options?.sortBy) {
          case 'popular':
            anonymousQuery.order('popularity_score', { ascending: false });
            break;
          case 'newest':
            anonymousQuery.order('created_at', { ascending: false });
            break;
          case 'price-low':
            anonymousQuery.order('msrp', { ascending: true });
            break;
          case 'price-high':
            anonymousQuery.order('msrp', { ascending: false });
            break;
          default:
            anonymousQuery.order('popularity_score', { ascending: false });
        }
        
        const { data: anonymousData, error: anonymousError } = await anonymousQuery;
        if (!anonymousError && anonymousData) {
          return anonymousData.map(equipment => {
            // Use unified photo service for consistency
            const bestPhoto = getBestEquipmentPhoto(equipment);
            
            return {
              ...equipment,
              averageRating: null,
              primaryPhoto: bestPhoto,
              most_liked_photo: bestPhoto,
              savesCount: 0,
              totalLikes: 0
            };
          });
        }
      }
      
      if (session) {
        // Retry the query
        const retryResult = await query;
        if (!retryResult.error) {
          return retryResult.data?.map(equipment => {
            // Use unified photo service for consistency
            const bestPhoto = getBestEquipmentPhoto(equipment);
            
            return {
              ...equipment,
              averageRating: null,
              primaryPhoto: bestPhoto,
              most_liked_photo: bestPhoto,
              savesCount: 0,
              totalLikes: 0
            };
          });
        }
      }
    }
    throw error;
  }
  
  // Process equipment using unified photo service for consistency
  return data?.map(equipment => {
    // Use unified photo service for best photo selection
    const bestPhoto = getBestEquipmentPhoto(equipment);
    
    return {
      ...equipment,
      averageRating: null,
      primaryPhoto: bestPhoto,
      most_liked_photo: bestPhoto, // For backward compatibility
      savesCount: 0,
      totalLikes: 0
    };
  });
}

// Get single equipment details
export async function getEquipmentDetails(equipmentId: string) {
  console.log('Fetching equipment details for:', equipmentId);
  
  // Start with basic equipment data
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (equipmentError) {
    console.error('Error fetching equipment:', equipmentError);
    throw equipmentError;
  }

  console.log('Basic equipment data:', equipment);

  // Try to fetch related data, but don't fail if these don't work
  let reviews: any = { data: [] };
  let photos: any = { data: [] };
  
  try {
    // First try normal query - get ALL photos for this equipment
    [reviews, photos] = await Promise.all([
      supabase
        .from('equipment_reviews')
        .select('*')
        .eq('equipment_id', equipmentId),
      supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', equipmentId)
        // Remove user_id filter to get ALL photos
        .order('likes_count', { ascending: false })
    ]);
    
    console.log('[getEquipmentDetails] Photos query result:', {
      hasData: !!photos.data,
      dataLength: photos.data?.length || 0,
      error: photos.error
    });
    
    // If photos query failed or returned empty due to RLS, try a workaround
    if (!photos.data || photos.data.length === 0) {
      console.log('[getEquipmentDetails] No photos found, checking if RLS issue...');
      
      // Try fetching directly without RLS by using a different approach
      // This is a temporary workaround until RLS is fixed
      const { data: equipmentWithPhotos } = await supabase
        .from('equipment')
        .select(`
          id,
          equipment_photos!inner (
            id,
            photo_url,
            caption,
            is_primary,
            likes_count,
            created_at,
            user_id
          )
        `)
        .eq('id', equipmentId)
        // Remove user_id filter to get ALL photos
        .single();
        
      if (equipmentWithPhotos?.equipment_photos) {
        console.log('[getEquipmentDetails] Found photos via join query:', equipmentWithPhotos.equipment_photos.length);
        photos.data = equipmentWithPhotos.equipment_photos;
      }
    }
    
    if (photos.error) {
      console.error('[getEquipmentDetails] Error fetching photos:', photos.error);
    }
  } catch (err) {
    console.warn('Error fetching related data:', err);
  }

  // Get the best photo from ALL photos (not just user photos)
  // This includes photos uploaded through equipment modals, bag equipment, etc.
  const allPhotos = photos.data || [];
  console.log('[getEquipmentDetails] All photos:', allPhotos.length);

  // Sort by likes_count descending (already sorted from query, but double-check)
  const sortedPhotos = [...allPhotos].sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0));
  const mostLikedPhoto = sortedPhotos[0]?.photo_url;
  const anyPhoto = allPhotos[0]?.photo_url; // Get any photo as fallback
  const bestPhoto = mostLikedPhoto || anyPhoto;
  
  console.log('[getEquipmentDetails] Photo resolution:', {
    totalPhotos: photos.data?.length || 0,
    allPhotos: allPhotos.length,
    mostLikedPhoto: !!mostLikedPhoto,
    bestPhoto: bestPhoto || 'NONE',
    equipmentImageUrl: equipment.image_url || 'NONE'
  });

  // Combine the data
  const data = {
    ...equipment,
    equipment_reviews: reviews.data || [],
    equipment_photos: photos.data || [],
    equipment_prices: [],
    equipment_discussions: [],
    primaryPhoto: bestPhoto || equipment.image_url, // Use best available photo
    most_liked_photo: mostLikedPhoto || anyPhoto // Ensure we have a photo if available
  };
  
  // Calculate aggregate data
  const averageRating = data.equipment_reviews?.length 
    ? data.equipment_reviews.reduce((sum, r) => sum + r.rating, 0) / data.equipment_reviews.length 
    : null;
  
  const lowestPrice = data.equipment_prices?.length
    ? Math.min(...data.equipment_prices.map(p => p.sale_price || p.price))
    : null;

  // Get top bags using this equipment
  const topBags = await getTopBagsWithEquipment(equipmentId);
  
  const result = {
    ...data,
    averageRating,
    lowestPrice,
    reviewCount: data.equipment_reviews?.length || 0,
    photoCount: data.equipment_photos?.length || 0,
    topBags,
    primaryPhoto: bestPhoto || equipment.image_url
  };
  
  console.log('[getEquipmentDetails] Returning data with:', {
    id: result.id,
    brand: result.brand,
    model: result.model,
    primaryPhoto: result.primaryPhoto || 'MISSING',
    most_liked_photo: result.most_liked_photo || 'MISSING',
    image_url: result.image_url || 'MISSING'
  });
  
  return result;
}

// Search equipment
export async function searchEquipment(query: string) {
  // Sanitize search input to prevent SQL injection
  const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .or(`brand.ilike.%${sanitizedQuery}%,model.ilike.%${sanitizedQuery}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

// Create review (updated with new fields)
export async function createReview(review: {
  user_id: string;
  equipment_id: string;
  rating: number;
  title?: string | null;
  review: string;
}) {
  console.log('[equipment.service] Creating review:', review);
  
  const { data, error } = await supabase
    .from('equipment_reviews')
    .insert({
      ...review,
      tee_count: 0 // Initialize tee count
    })
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error('[equipment.service] Error creating review:', error);
    throw error;
  }
  
  console.log('[equipment.service] Review created:', data);
  return data;
}

// Get reviews with sorting
export async function getReviews(equipmentId: string, sortBy: 'newest' | 'most_teed' = 'newest') {
  console.log('[equipment.service] Getting reviews:', { equipmentId, sortBy });
  
  let query = supabase
    .from('equipment_reviews')
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('equipment_id', equipmentId);

  // Apply sorting
  if (sortBy === 'most_teed') {
    query = query.order('tee_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('[equipment.service] Error getting reviews:', error);
    throw error;
  }

  console.log('[equipment.service] Reviews fetched:', data?.length);
  return data || [];
}

// Tee/untee a review
export async function teeReview(reviewId: string, userId: string, tee: boolean) {
  console.log('[equipment.service] Tee review:', { reviewId, userId, tee });
  
  if (tee) {
    // Add tee
    const { error } = await supabase
      .from('review_tees')
      .insert({
        review_id: reviewId,
        user_id: userId
      });

    if (error && !error.message?.includes('duplicate')) {
      console.error('[equipment.service] Error adding tee:', error);
      throw error;
    }
  } else {
    // Remove tee
    const { error } = await supabase
      .from('review_tees')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);

    if (error) {
      console.error('[equipment.service] Error removing tee:', error);
      throw error;
    }
  }

  console.log('[equipment.service] Tee action completed');
}

// Check if user has teed a review
export async function checkUserTeedReview(reviewId: string, userId: string): Promise<boolean> {
  console.log('[equipment.service] Checking user teed review:', { reviewId, userId });
  
  const { data, error } = await supabase
    .from('review_tees')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[equipment.service] Error checking tee:', error);
    return false;
  }

  console.log('[equipment.service] User has teed:', !!data);
  return !!data;
}

// Get user's teed reviews for equipment
export async function getUserReviewTees(userId: string, equipmentId: string) {
  console.log('[equipment.service] Getting user review tees:', { userId, equipmentId });
  
  const { data, error } = await supabase
    .from('review_tees')
    .select(`
      review_id,
      equipment_reviews!inner (
        id,
        equipment_id
      )
    `)
    .eq('user_id', userId)
    .eq('equipment_reviews.equipment_id', equipmentId);

  if (error) {
    console.error('[equipment.service] Error getting user tees:', error);
    return [];
  }

  return data?.map(item => item.review_id) || [];
}

// Check if equipment is saved by user
export async function isEquipmentSaved(userId: string, equipmentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('equipment_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "The result contains 0 rows" which is expected when not saved
      console.error('Error checking equipment save status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking equipment save status:', error);
    return false;
  }
}

// Save/unsave equipment
export async function toggleEquipmentSave(userId: string, equipmentId: string) {
  try {
    // Check if already saved
    const { data: existing, error: checkError } = await supabase
      .from('equipment_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .single();

    // Handle check error (ignore if not found)
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking save status:', checkError);
      throw new Error(`Failed to check save status: ${checkError.message}`);
    }

    if (existing) {
      // Unsave
      console.log('Removing save for equipment:', equipmentId);
      const { error } = await supabase
        .from('equipment_saves')
        .delete()
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error removing save:', error);
        throw new Error(`Failed to remove from saved: ${error.message}`);
      }
      console.log('Successfully removed save');
      return false; // unsaved
    } else {
      // Save
      console.log('Creating save for equipment:', equipmentId);
      const { error } = await supabase
        .from('equipment_saves')
        .insert({
          user_id: userId,
          equipment_id: equipmentId
        });
      
      if (error) {
        console.error('Error saving equipment:', error);
        if (error.code === 'PGRST301' || error.message?.includes('duplicate')) {
          throw new Error('Equipment is already saved');
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error('Permission denied. Please make sure you are signed in.');
        } else {
          throw new Error(`Failed to save equipment: ${error.message}`);
        }
      }
      return true; // saved
    }
  } catch (error) {
    console.error('Error in toggleEquipmentSave:', error);
    throw error;
  }
}

// Add to wishlist
export async function addToWishlist(userId: string, equipmentId: string, priority?: 'high' | 'medium' | 'low', notes?: string) {
  const { data, error } = await supabase
    .from('equipment_wishlist')
    .insert({
      user_id: userId,
      equipment_id: equipmentId,
      priority,
      notes
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove from wishlist
export async function removeFromWishlist(userId: string, equipmentId: string) {
  const { error } = await supabase
    .from('equipment_wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('equipment_id', equipmentId);

  if (error) throw error;
}

// Get user's wishlist
export async function getUserWishlist(userId: string) {
  const { data, error } = await supabase
    .from('equipment_wishlist')
    .select(`
      *,
      equipment:equipment (
        *,
        equipment_photos (
          photo_url,
          is_primary
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(item => ({
    ...item,
    equipment: {
      ...item.equipment,
      primaryPhoto: item.equipment?.equipment_photos?.find(p => p.is_primary)?.photo_url || item.equipment?.image_url
    }
  }));
}

// Get user's saved equipment
export async function getUserSavedEquipment(userId: string) {
  console.log('getUserSavedEquipment called for user:', userId);
  
  const { data, error } = await supabase
    .from('equipment_saves')
    .select(`
      *,
      equipment:equipment_id (
        *,
        equipment_photos (
          photo_url,
          is_primary,
          likes_count
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log('getUserSavedEquipment raw data:', data);
  console.log('getUserSavedEquipment error:', error);
  
  if (error) throw error;
  
  return data?.map(item => {
    if (!item.equipment) return null;
    
    // Get most liked photo for saved equipment too
    const sortedPhotos = item.equipment?.equipment_photos?.sort((a, b) => 
      (b.likes_count || 0) - (a.likes_count || 0)
    );
    const primaryPhoto = sortedPhotos?.[0]?.photo_url || 
                        item.equipment?.equipment_photos?.find(p => p.is_primary)?.photo_url || 
                        item.equipment?.image_url;
    
    return {
      ...item.equipment,
      primaryPhoto,
      most_liked_photo: sortedPhotos?.[0]?.photo_url,
      created_at: item.created_at // Keep the save date
    };
  }).filter(Boolean);
}

// Upload equipment photo
export async function uploadEquipmentPhoto(
  userId: string, 
  equipmentId: string, 
  file: File, 
  caption?: string,
  isPrimary: boolean = false
) {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Please upload a JPEG, PNG, WebP, or GIF image.`);
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${equipmentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    console.log('Uploading file:', fileName, 'Type:', file.type, 'Size:', file.size);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('equipment-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      if (uploadError.message?.includes('row-level security')) {
        throw new Error('Permission denied. Please make sure you are logged in.');
      } else if (uploadError.message?.includes('bucket')) {
        throw new Error('Storage bucket not found. Please contact support.');
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-photos')
      .getPublicUrl(fileName);

    console.log('File uploaded, saving to database. URL:', publicUrl);

    // Save to database
    const { data, error } = await supabase
      .from('equipment_photos')
      .insert({
        user_id: userId,
        equipment_id: equipmentId,
        photo_url: publicUrl,
        caption,
        is_primary: isPrimary,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      // Try to clean up the uploaded file
      await supabase.storage
        .from('equipment-photos')
        .remove([fileName]);
      
      if (error.message?.includes('row-level security')) {
        throw new Error('Permission denied. Please make sure you are logged in.');
      } else {
        throw new Error(`Failed to save photo information: ${error.message}`);
      }
    }

    console.log('Photo uploaded successfully:', data);
    return publicUrl;
  } catch (error) {
    console.error('Upload equipment photo error:', error);
    throw error;
  }
}

// Get all unique brands from equipment
export async function getEquipmentBrands() {
  const { data, error } = await supabase
    .from('equipment')
    .select('brand')
    .order('brand');

  if (error) {
    console.error('Error fetching brands:', error);
    return [];
  }

  // Get unique brands
  const uniqueBrands = Array.from(new Set(data.map(item => item.brand).filter(Boolean)));
  return uniqueBrands.sort();
}

// Get models for a specific brand
export async function getEquipmentModels(brand: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('model, category')
    .eq('brand', brand)
    .order('model');

  if (error) {
    console.error('Error fetching models:', error);
    return [];
  }

  // Return models with their categories for better context
  return data.map(item => ({
    model: item.model,
    category: item.category
  }));
}

// Search equipment by query (for autocomplete)
export async function searchEquipmentByQuery(query: string) {
  // Sanitize search input to prevent SQL injection
  const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or(`brand.ilike.%${sanitizedQuery}%,model.ilike.%${sanitizedQuery}%`)
    .limit(10);

  if (error) {
    console.error('Error searching equipment:', error);
    return [];
  }

  return data;
}