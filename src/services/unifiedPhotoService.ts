import { supabase } from '@/lib/supabase';

interface EquipmentPhoto {
  id: string;
  photo_url: string;
  likes_count: number;
  is_primary?: boolean;
  user_id?: string;
  created_at?: string;
}

interface EquipmentWithPhotos {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
  equipment_photos?: EquipmentPhoto[];
  custom_photo_url?: string; // Deprecated
}

interface BagEquipmentWithPhoto {
  selected_photo_id?: string;
  custom_photo_url?: string; // Deprecated fallback
  equipment: EquipmentWithPhotos;
}

/**
 * Gets the best available photo URL for equipment with proper fallback logic
 * Priority order:
 * 1. Selected photo from unified pool (selected_photo_id)
 * 2. Custom photo URL (deprecated fallback)
 * 3. Most liked community photo from equipment_photos
 * 4. Equipment's default image_url (if not placeholder)
 * 5. Category fallback image
 * 6. null (will trigger brand initials display)
 */
export function getBestEquipmentPhoto(
  equipment: EquipmentWithPhotos,
  customPhotoUrl?: string
): string | null {
  // 1. Custom photo URL (deprecated fallback)
  if (customPhotoUrl && !isPlaceholder(customPhotoUrl)) {
    return customPhotoUrl;
  }

  // 2. Most liked community photo
  if (equipment.equipment_photos && equipment.equipment_photos.length > 0) {
    const validPhotos = equipment.equipment_photos
      .filter(photo => photo.photo_url && !isPlaceholder(photo.photo_url))
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    
    if (validPhotos.length > 0) {
      return validPhotos[0].photo_url;
    }
  }

  // 3. Equipment's default image_url (if not placeholder)
  if (equipment.image_url && !isPlaceholder(equipment.image_url)) {
    return equipment.image_url;
  }

  // 4. Category fallback (optional - can be implemented later)
  // const categoryImage = getCategoryFallbackImage(equipment.category);
  // if (categoryImage) return categoryImage;

  // 5. Return null to trigger brand initials display
  return null;
}

/**
 * Gets the best photo for bag equipment using unified photo pool
 * Priority order:
 * 1. User's selected photo (selected_photo_id)
 * 2. Custom photo URL (deprecated fallback)
 * 3. Most liked community photo
 * 4. Equipment's default image_url
 * 5. null
 */
export function getBestBagEquipmentPhoto(
  bagEquipment: BagEquipmentWithPhoto
): string | null {
  const { selected_photo_id, custom_photo_url, equipment } = bagEquipment;
  
  // 1. User's selected photo from unified pool (highest priority)
  if (selected_photo_id) {
    if (equipment.equipment_photos && equipment.equipment_photos.length > 0) {
      const selectedPhoto = equipment.equipment_photos.find(p => p.id === selected_photo_id);
      if (selectedPhoto && !isPlaceholder(selectedPhoto.photo_url)) {
        console.log('Found selected photo for', equipment.brand, equipment.model, ':', selectedPhoto.photo_url);
        return selectedPhoto.photo_url;
      } else {
        console.warn('Selected photo ID not found in equipment_photos for', equipment.brand, equipment.model, 
          'selected_photo_id:', selected_photo_id, 
          'available photo ids:', equipment.equipment_photos.map(p => p.id));
      }
    } else {
      console.warn('No equipment_photos loaded for', equipment.brand, equipment.model, 
        'but selected_photo_id exists:', selected_photo_id);
    }
  }
  
  // 2. Fall back to the standard photo selection logic
  return getBestEquipmentPhoto(equipment, custom_photo_url);
}

/**
 * Check if a URL is a placeholder image
 */
function isPlaceholder(url: string): boolean {
  if (!url) return true;
  return url.toLowerCase().includes('placehold') || 
         url.toLowerCase().includes('placeholder');
}

/**
 * Fetch equipment photos from the database
 */
export async function fetchEquipmentPhotos(
  equipmentId: string,
  limit: number = 20
): Promise<EquipmentPhoto[]> {
  const { data, error } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId)
    .not('photo_url', 'ilike', '%placehold%')
    .order('likes_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching equipment photos:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch community photos for equipment selection
 * Returns photos sorted by likes with user's own photos first
 */
export async function fetchCommunityPhotosForSelection(
  equipmentId: string,
  userId?: string
): Promise<EquipmentPhoto[]> {
  let query = supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId)
    .not('photo_url', 'ilike', '%placehold%');

  const { data, error } = await query
    .order('likes_count', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching community photos:', error);
    return [];
  }

  const photos = data || [];

  // Sort to put user's photos first if userId provided
  if (userId) {
    return photos.sort((a, b) => {
      if (a.user_id === userId && b.user_id !== userId) return -1;
      if (a.user_id !== userId && b.user_id === userId) return 1;
      return (b.likes_count || 0) - (a.likes_count || 0);
    });
  }

  return photos;
}

/**
 * Sync a user's custom photo to the equipment_photos table
 * This ensures custom photos are available to the community
 */
export async function syncCustomPhotoToEquipment(
  userId: string,
  equipmentId: string,
  photoUrl: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this photo already exists
    const { data: existing } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('equipment_id', equipmentId)
      .eq('photo_url', photoUrl)
      .single();

    if (existing) {
      return { success: true }; // Photo already synced
    }

    // Add the photo to equipment_photos
    const { error } = await supabase
      .from('equipment_photos')
      .insert({
        equipment_id: equipmentId,
        user_id: userId,
        photo_url: photoUrl,
        caption: caption || '',
        is_primary: false,
        likes_count: 0,
        source: 'user_upload'
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error syncing custom photo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sync photo' 
    };
  }
}

/**
 * Get a fallback image for a category
 * This can be expanded to return actual category images
 */
export function getCategoryFallbackImage(category: string): string | null {
  // This could be expanded to return actual category-specific images
  // For now, return null to use brand initials
  return null;
}

/**
 * Preload equipment photos for multiple items
 * Useful for feed and bag displays
 */
export async function preloadEquipmentPhotos(
  equipmentIds: string[]
): Promise<Map<string, EquipmentPhoto[]>> {
  if (equipmentIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('equipment_photos')
    .select('*')
    .in('equipment_id', equipmentIds)
    .not('photo_url', 'ilike', '%placehold%')
    .order('likes_count', { ascending: false });

  if (error) {
    console.error('Error preloading equipment photos:', error);
    return new Map();
  }

  // Group photos by equipment_id
  const photoMap = new Map<string, EquipmentPhoto[]>();
  (data || []).forEach(photo => {
    const equipmentPhotos = photoMap.get(photo.equipment_id) || [];
    equipmentPhotos.push(photo);
    photoMap.set(photo.equipment_id, equipmentPhotos);
  });

  return photoMap;
}