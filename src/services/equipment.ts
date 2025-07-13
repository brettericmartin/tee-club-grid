import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { getTopBagsWithEquipment } from './equipmentBags';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type EquipmentReview = Database['public']['Tables']['equipment_reviews']['Row'];
type EquipmentPhoto = Database['public']['Tables']['equipment_photos']['Row'];

// Get all equipment with filters
export async function getEquipment(options?: {
  category?: string;
  sortBy?: 'popular' | 'newest' | 'price-low' | 'price-high';
  search?: string;
}) {
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
    query = query.or(`brand.ilike.%${options.search}%,model.ilike.%${options.search}%`);
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
  
  if (error) throw error;
  
  // Return simplified data with proper photo handling
  return data?.map(equipment => {
    // Sort photos by likes_count to get the most liked one
    const sortedPhotos = equipment.equipment_photos?.sort((a, b) => 
      (b.likes_count || 0) - (a.likes_count || 0)
    );
    
    // Use the most liked photo, or the first one, or fall back to image_url
    const mostLikedPhoto = sortedPhotos?.[0]?.photo_url || null;
    const primaryPhoto = mostLikedPhoto || equipment.image_url;
    
    return {
      ...equipment,
      averageRating: null,
      primaryPhoto,
      most_liked_photo: mostLikedPhoto,
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
    [reviews, photos] = await Promise.all([
      supabase
        .from('equipment_reviews')
        .select('*')
        .eq('equipment_id', equipmentId),
      supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('likes_count', { ascending: false })
    ]);
  } catch (err) {
    console.warn('Error fetching related data:', err);
  }

  // Get the most liked photo as primaryPhoto
  const mostLikedPhoto = photos.data && photos.data.length > 0 
    ? photos.data[0].photo_url 
    : null;

  // Combine the data
  const data = {
    ...equipment,
    equipment_reviews: reviews.data || [],
    equipment_photos: photos.data || [],
    equipment_prices: [],
    equipment_discussions: [],
    primaryPhoto: mostLikedPhoto, // Set most liked photo as primary
    most_liked_photo: mostLikedPhoto // Also add for consistency
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
  
  return {
    ...data,
    averageRating,
    lowestPrice,
    reviewCount: data.equipment_reviews?.length || 0,
    photoCount: data.equipment_photos?.length || 0,
    topBags,
    primaryPhoto: mostLikedPhoto || equipment.image_url
  };
}

// Search equipment
export async function searchEquipment(query: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

// Add review
export async function addEquipmentReview(review: {
  user_id: string;
  equipment_id: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
}) {
  const { data, error } = await supabase
    .from('equipment_reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
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
      const { error } = await supabase
        .from('equipment_saves')
        .delete()
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error removing save:', error);
        throw new Error(`Failed to remove from saved: ${error.message}`);
      }
      return false; // unsaved
    } else {
      // Save
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
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching equipment:', error);
    return [];
  }

  return data;
}