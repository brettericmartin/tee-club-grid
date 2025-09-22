/**
 * Shared utility for processing equipment photos with consistent priority logic
 * Used by both bags service and feed cards to ensure identical photo selection
 */

import { getItemDisplayPhoto } from '@/services/unifiedPhotoService';

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
 * Process equipment to compute display photo for each bag_equipment item
 * IMPORTANT: Sets displayPhoto on the bag_equipment item, not on shared equipment object
 * This allows different variants (e.g., two woods) to show different photos
 */
export function processEquipmentPhotos(bagEquipment: BagEquipmentItem[]): BagEquipmentItem[] {
  return bagEquipment.map(item => {
    // CRITICAL: Create a new object to prevent shared references
    // This ensures each variant maintains its own data
    const processedItem = { ...item };
    
    if (processedItem.equipment) {
      // Use the unified photo getter - SINGLE SOURCE OF TRUTH
      const displayPhoto = getItemDisplayPhoto(processedItem);
    }
    
    return processedItem;
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
 * ALWAYS uses the unified photo getter for consistency
 */
export function getEquipmentImageUrl(item: BagEquipmentItem): string | null {
  // Use the unified photo getter - SINGLE SOURCE OF TRUTH
  return getItemDisplayPhoto(item);
}