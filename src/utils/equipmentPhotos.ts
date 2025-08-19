/**
 * Shared utility for processing equipment photos with consistent priority logic
 * Used by both bags service and feed cards to ensure identical photo selection
 */

export interface EquipmentWithPhotos {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
  equipment_photos?: Array<{
    id: string;
    photo_url: string;
    likes_count?: number;
    is_primary?: boolean;
  }>;
  primaryPhoto?: string;
  most_liked_photo?: string;
}

export interface BagEquipmentItem {
  id: string;
  equipment_id: string;
  custom_photo_url?: string;
  equipment: EquipmentWithPhotos;
  [key: string]: any;
}

/**
 * Process equipment to set primaryPhoto using consistent priority logic:
 * 1. User's custom selected photo (custom_photo_url)
 * 2. Most liked community photo from equipment_photos
 * 3. Default equipment image (image_url)
 */
export function processEquipmentPhotos(bagEquipment: BagEquipmentItem[]): BagEquipmentItem[] {
  return bagEquipment.map(item => {
    if (item.equipment) {
      // First priority: User's custom selected photo
      if (item.custom_photo_url) {
        item.equipment.primaryPhoto = item.custom_photo_url;
      } 
      // Second priority: Most liked community photo from equipment_photos
      else if (item.equipment.equipment_photos && item.equipment.equipment_photos.length > 0) {
        // Sort photos by likes_count to get the most liked one
        const sortedPhotos = [...item.equipment.equipment_photos].sort((a, b) => 
          (b.likes_count || 0) - (a.likes_count || 0)
        );
        
        // Add most_liked_photo to equipment object
        item.equipment.most_liked_photo = sortedPhotos[0]?.photo_url || null;
        item.equipment.primaryPhoto = item.equipment.most_liked_photo;
      } 
      // Third priority: Default equipment image
      else {
        item.equipment.primaryPhoto = item.equipment.image_url;
      }
    }
    return item;
  });
}

/**
 * Process a single bag's equipment data
 */
export function processBagData(bagData: any): any {
  if (!bagData) return null;
  
  const processedEquipment = processEquipmentPhotos(bagData.bag_equipment || []);
  
  return {
    ...bagData,
    bag_equipment: processedEquipment,
    totalValue: processedEquipment.reduce((sum, item) => 
      sum + (item.purchase_price || item.equipment?.msrp || 0), 0
    ) || 0,
    likesCount: bagData.likes_count || 0
  };
}

/**
 * Get the best available image URL for an equipment item
 * Priority: primaryPhoto (from equipment_photos) > custom_photo_url > image_url
 */
export function getEquipmentImageUrl(item: BagEquipmentItem): string | null {
  return (item.equipment as any)?.primaryPhoto || 
         item.custom_photo_url || 
         item.equipment?.image_url || 
         null;
}