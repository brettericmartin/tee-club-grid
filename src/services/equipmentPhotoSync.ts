import { supabase } from '@/lib/supabase';

/**
 * Syncs a user's custom photo from bag_equipment to the equipment_photos table
 * This ensures photos show up on equipment detail pages
 */
export async function syncUserPhotoToEquipment(
  userId: string,
  equipmentId: string,
  photoUrl: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this photo already exists in equipment_photos
    const { data: existing, error: checkError } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .eq('photo_url', photoUrl)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing photo:', checkError);
      return { success: false, error: checkError.message };
    }

    // If photo already exists, skip
    if (existing) {
      console.log('Photo already synced to equipment_photos');
      return { success: true };
    }

    // Insert the photo into equipment_photos
    const { error: insertError } = await supabase
      .from('equipment_photos')
      .insert({
        user_id: userId,
        equipment_id: equipmentId,
        photo_url: photoUrl,
        source: 'user_upload',
        caption: caption || 'User equipment photo',
        is_primary: false,
        likes_count: 0
      });

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        console.log('Photo already exists (constraint)');
        return { success: true }; // Not really an error
      }
      console.error('Error inserting equipment photo:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('Successfully synced photo to equipment_photos');
    return { success: true };

  } catch (error) {
    console.error('Error in syncUserPhotoToEquipment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Updates custom_photo_url in bag_equipment and syncs to equipment_photos
 */
export async function updateBagEquipmentPhoto(
  bagEquipmentId: string,
  userId: string,
  equipmentId: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update bag_equipment custom_photo_url
    const { error: updateError } = await supabase
      .from('bag_equipment')
      .update({ custom_photo_url: photoUrl })
      .eq('id', bagEquipmentId);

    if (updateError) {
      console.error('Error updating bag equipment photo:', updateError);
      return { success: false, error: updateError.message };
    }

    // Sync to equipment_photos
    const syncResult = await syncUserPhotoToEquipment(
      userId,
      equipmentId,
      photoUrl,
      'Custom equipment photo'
    );

    return syncResult;

  } catch (error) {
    console.error('Error in updateBagEquipmentPhoto:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Removes a photo from equipment_photos when removed from bag_equipment
 */
export async function removeUserPhotoFromEquipment(
  userId: string,
  equipmentId: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('equipment_photos')
      .delete()
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .eq('photo_url', photoUrl)
      .eq('source', 'user_upload');

    if (error) {
      console.error('Error removing equipment photo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Error in removeUserPhotoFromEquipment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Syncs a photo uploaded through feed to the user's bag equipment
 * This ensures photos uploaded via feed show up in the user's bag
 */
export async function syncFeedPhotoToBagEquipment(
  userId: string,
  equipmentId: string,
  photoUrl: string,
  updateIfExists: boolean = false
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    // First, find user's bags
    const { data: userBags, error: bagsError } = await supabase
      .from('user_bags')
      .select('id')
      .eq('user_id', userId);

    if (bagsError) {
      console.error('Error fetching user bags:', bagsError);
      return { success: false, updated: 0, error: bagsError.message };
    }

    if (!userBags || userBags.length === 0) {
      console.log('User has no bags');
      return { success: true, updated: 0 }; // Not an error, user just has no bags
    }

    const bagIds = userBags.map(bag => bag.id);

    // Find bag_equipment entries for this equipment in user's bags
    const { data: bagEquipment, error: equipmentError } = await supabase
      .from('bag_equipment')
      .select('id, custom_photo_url')
      .eq('equipment_id', equipmentId)
      .in('bag_id', bagIds);

    if (equipmentError) {
      console.error('Error fetching bag equipment:', equipmentError);
      return { success: false, updated: 0, error: equipmentError.message };
    }

    if (!bagEquipment || bagEquipment.length === 0) {
      console.log('User does not have this equipment in any bags');
      return { success: true, updated: 0 }; // Not an error, equipment not in bags
    }

    let updatedCount = 0;

    // Update bag_equipment entries
    for (const item of bagEquipment) {
      // Only update if no custom photo exists or if updateIfExists is true
      if (!item.custom_photo_url || updateIfExists) {
        const { error: updateError } = await supabase
          .from('bag_equipment')
          .update({ custom_photo_url: photoUrl })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Error updating bag equipment ${item.id}:`, updateError);
          // Continue with other items even if one fails
        } else {
          updatedCount++;
          console.log(`Updated bag_equipment ${item.id} with new photo`);
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} bag equipment entries`);
    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('Error in syncFeedPhotoToBagEquipment:', error);
    return { 
      success: false, 
      updated: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}