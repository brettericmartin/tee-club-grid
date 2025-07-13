/**
 * Unified photo selection utilities for consistent photo handling across the app
 */

interface EquipmentPhoto {
  id: string;
  photo_url: string;
  likes_count: number;
  is_primary?: boolean;
  user_id?: string;
  created_at?: string;
}

interface Equipment {
  id: string;
  image_url?: string | null;
  equipment_photos?: EquipmentPhoto[];
  // Extended properties that might exist
  most_liked_photo?: string | null;
  primaryPhoto?: string | null;
}

interface BagEquipment {
  custom_photo_url?: string | null;
  equipment?: Equipment;
}

/**
 * Get the best available photo for a piece of equipment
 * Priority order:
 * 1. Custom photo URL (user's specific photo for their equipment)
 * 2. Primary community photo
 * 3. Most liked community photo
 * 4. Any community photo
 * 5. Original manufacturer photo
 * 6. Placeholder
 */
export function getEquipmentPhoto(
  equipment?: Equipment | null,
  customPhotoUrl?: string | null
): string {
  // 1. Check for custom photo URL first (highest priority)
  if (customPhotoUrl) {
    return customPhotoUrl;
  }

  if (!equipment) {
    return '/placeholder.svg';
  }

  // 2. Check for primary community photo
  if (equipment.equipment_photos && equipment.equipment_photos.length > 0) {
    const primaryPhoto = equipment.equipment_photos.find(photo => photo.is_primary);
    if (primaryPhoto) {
      return primaryPhoto.photo_url;
    }

    // 3. Get most liked community photo
    const sortedByLikes = [...equipment.equipment_photos].sort(
      (a, b) => (b.likes_count || 0) - (a.likes_count || 0)
    );
    if (sortedByLikes[0]) {
      return sortedByLikes[0].photo_url;
    }
  }

  // 4. Check for legacy most_liked_photo property
  if (equipment.most_liked_photo) {
    return equipment.most_liked_photo;
  }

  // 5. Check for legacy primaryPhoto property
  if (equipment.primaryPhoto) {
    return equipment.primaryPhoto;
  }

  // 6. Fall back to original manufacturer photo
  if (equipment.image_url) {
    return equipment.image_url;
  }

  // 7. Final fallback to placeholder
  return '/placeholder.svg';
}

/**
 * Get photo for bag equipment (includes custom photo support)
 */
export function getBagEquipmentPhoto(bagEquipment: BagEquipment): string {
  return getEquipmentPhoto(
    bagEquipment.equipment,
    bagEquipment.custom_photo_url
  );
}

/**
 * Get all available photos for a piece of equipment
 * Returns array sorted by: primary first, then by likes
 */
export function getAllEquipmentPhotos(
  equipment?: Equipment | null,
  customPhotoUrl?: string | null
): string[] {
  const photos: string[] = [];

  // Add custom photo first if available
  if (customPhotoUrl) {
    photos.push(customPhotoUrl);
  }

  if (equipment?.equipment_photos && equipment.equipment_photos.length > 0) {
    // Sort by primary status first, then by likes
    const sortedPhotos = [...equipment.equipment_photos].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (b.likes_count || 0) - (a.likes_count || 0);
    });

    // Add all community photos (avoid duplicates with custom photo)
    sortedPhotos.forEach(photo => {
      if (photo.photo_url && photo.photo_url !== customPhotoUrl) {
        photos.push(photo.photo_url);
      }
    });
  }

  // Add manufacturer photo if not already included
  if (equipment?.image_url && !photos.includes(equipment.image_url)) {
    photos.push(equipment.image_url);
  }

  // Ensure at least a placeholder
  if (photos.length === 0) {
    photos.push('/placeholder.svg');
  }

  return photos;
}

/**
 * Check if equipment has community photos
 */
export function hasCommunityPhotos(equipment?: Equipment | null): boolean {
  return !!(equipment?.equipment_photos && equipment.equipment_photos.length > 0);
}

/**
 * Get community photo count
 */
export function getCommunityPhotoCount(equipment?: Equipment | null): number {
  return equipment?.equipment_photos?.length || 0;
}

/**
 * Get the most liked photo from equipment
 */
export function getMostLikedPhoto(equipment?: Equipment | null): EquipmentPhoto | null {
  if (!equipment?.equipment_photos || equipment.equipment_photos.length === 0) {
    return null;
  }

  return equipment.equipment_photos.reduce((prev, current) => 
    (current.likes_count || 0) > (prev.likes_count || 0) ? current : prev
  );
}