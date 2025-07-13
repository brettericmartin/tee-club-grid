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