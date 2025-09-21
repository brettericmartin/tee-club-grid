/**
 * Shared utility for processing equipment photos with consistent priority logic
 * Used by both bags service and feed cards to ensure identical photo selection
 */

import { getBestBagEquipmentPhoto } from '@/services/unifiedPhotoService';

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
  selected_photo_id?: string;
  equipment: EquipmentWithPhotos;
  [key: string]: any;
}

/**
 * Process equipment to set primaryPhoto using consistent priority logic:
 * 1. User's selected photo from pool (selected_photo_id)
 * 2. User's custom photo (custom_photo_url)
 * 3. Most liked community photo from equipment_photos
 * 4. Default equipment image (image_url)
 */
export function processEquipmentPhotos(bagEquipment: BagEquipmentItem[]): BagEquipmentItem[] {
  return bagEquipment.map(item => {
    if (item.equipment) {
      // Use unified photo service for consistent photo selection
      const bestPhoto = getBestBagEquipmentPhoto({
        selected_photo_id: item.selected_photo_id,
        custom_photo_url: item.custom_photo_url,
        equipment: item.equipment
      });
      item.equipment.primaryPhoto = bestPhoto;
      
      // Also set most_liked_photo for compatibility
      if (item.equipment.equipment_photos && item.equipment.equipment_photos.length > 0) {
        const sortedPhotos = [...item.equipment.equipment_photos].sort((a, b) => 
          (b.likes_count || 0) - (a.likes_count || 0)
        );
        item.equipment.most_liked_photo = sortedPhotos[0]?.photo_url || null;
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
 * Priority: selected_photo_id > custom_photo_url > primaryPhoto > image_url
 */
export function getEquipmentImageUrl(item: BagEquipmentItem): string | null {
  // If primaryPhoto was already computed by processEquipmentPhotos, use it
  if ((item.equipment as any)?.primaryPhoto) {
    return (item.equipment as any).primaryPhoto;
  }
  
  // Otherwise compute it using the unified photo service
  return getBestBagEquipmentPhoto({
    selected_photo_id: item.selected_photo_id,
    custom_photo_url: item.custom_photo_url,
    equipment: item.equipment
  });
}