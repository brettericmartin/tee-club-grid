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
      equipment_reviews (rating),
      equipment_saves (count),
      equipment_photos (
        photo_url,
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
      query = query.order('release_date', { ascending: false });
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
  
  // Process data to include average rating and primary photo
  return data?.map(equipment => ({
    ...equipment,
    averageRating: equipment.equipment_reviews?.length 
      ? equipment.equipment_reviews.reduce((sum, r) => sum + r.rating, 0) / equipment.equipment_reviews.length 
      : null,
    primaryPhoto: equipment.equipment_photos?.find(p => p.is_primary)?.photo_url || equipment.image_url,
    savesCount: equipment.equipment_saves?.[0]?.count || 0
  }));
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
    ]);
  } catch (err) {
    console.warn('Error fetching related data:', err);
  }

  // Combine the data
  const data = {
    ...equipment,
    equipment_reviews: reviews.data || [],
    equipment_photos: photos.data || [],
    equipment_prices: [],
    equipment_discussions: []
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
    topBags
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

// Save/unsave equipment
export async function toggleEquipmentSave(userId: string, equipmentId: string) {
  // Check if already saved
  const { data: existing } = await supabase
    .from('equipment_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('equipment_id', equipmentId)
    .single();

  if (existing) {
    // Unsave
    const { error } = await supabase
      .from('equipment_saves')
      .delete()
      .eq('id', existing.id);
    
    if (error) throw error;
    return false; // unsaved
  } else {
    // Save
    const { error } = await supabase
      .from('equipment_saves')
      .insert({
        user_id: userId,
        equipment_id: equipmentId
      });
    
    if (error) throw error;
    return true; // saved
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
    ...item.equipment,
    primaryPhoto: item.equipment?.equipment_photos?.find(p => p.is_primary)?.photo_url || item.equipment?.image_url
  }));
}

// Upload equipment photo
export async function uploadEquipmentPhoto(
  userId: string, 
  equipmentId: string, 
  file: File, 
  caption?: string,
  isPrimary: boolean = false
) {
  // Upload to Supabase Storage
  const fileName = `${userId}/${equipmentId}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('equipment-images')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('equipment-images')
    .getPublicUrl(fileName);

  // Save to database
  const { data, error } = await supabase
    .from('equipment_photos')
    .insert({
      user_id: userId,
      equipment_id: equipmentId,
      photo_url: publicUrl,
      caption,
      is_primary: isPrimary
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}