import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function migrateBagPhotosToEquipmentPhotos() {
  console.log('=== Starting Photo Migration ===');
  console.log('This script will copy photos from bag_equipment.custom_photo_url');
  console.log('to the equipment_photos table for unified photo pool.');
  console.log('');

  // 1. Get all bag_equipment entries with custom photos
  const { data: bagEquipmentWithPhotos, error: fetchError } = await supabase
    .from('bag_equipment')
    .select(`
      id,
      equipment_id,
      custom_photo_url,
      bag_id,
      user_bags!inner (
        user_id
      )
    `)
    .not('custom_photo_url', 'is', null);

  if (fetchError) {
    console.error('Error fetching bag equipment:', fetchError);
    return;
  }

  const photoCount = bagEquipmentWithPhotos ? bagEquipmentWithPhotos.length : 0;
  console.log(`Found ${photoCount} bag equipment entries with photos`);
  console.log('');

  if (!bagEquipmentWithPhotos || bagEquipmentWithPhotos.length === 0) {
    console.log('No photos to migrate.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const item of bagEquipmentWithPhotos) {
    const userId = item.user_bags ? item.user_bags.user_id : null;

    if (!userId) {
      console.log(`⚠️  Skipping ${item.id} - no user_id found`);
      skipCount++;
      continue;
    }

    // Check if this photo already exists in equipment_photos
    const { data: existingPhoto } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('equipment_id', item.equipment_id)
      .eq('photo_url', item.custom_photo_url)
      .single();

    if (existingPhoto) {
      console.log(`⏭️  Photo already exists for equipment ${item.equipment_id}`);
      skipCount++;

      // Update bag_equipment to reference the existing photo
      const { error: updateError } = await supabase
        .from('bag_equipment')
        .update({ selected_photo_id: existingPhoto.id })
        .eq('id', item.id);

      if (updateError) {
        console.error('Error updating selected_photo_id:', updateError);
      } else {
        console.log(`   Updated bag_equipment to reference photo ${existingPhoto.id}`);
      }
      continue;
    }

    // Insert new photo into equipment_photos
    const { data: newPhoto, error: insertError } = await supabase
      .from('equipment_photos')
      .insert({
        equipment_id: item.equipment_id,
        photo_url: item.custom_photo_url,
        user_id: userId,
        caption: 'Uploaded via bag equipment',
        is_primary: false,
        likes_count: 0,
        metadata: {
          source: 'bag_equipment_migration',
          migrated_from_bag_id: item.bag_id,
          migrated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error(`❌ Error inserting photo for equipment ${item.equipment_id}:`, insertError);
      errorCount++;
      continue;
    }

    // Update bag_equipment to reference the new photo
    const { error: updateError } = await supabase
      .from('bag_equipment')
      .update({ selected_photo_id: newPhoto.id })
      .eq('id', item.id);

    if (updateError) {
      console.error('Error updating selected_photo_id:', updateError);
      errorCount++;
    } else {
      successCount++;
      console.log(`✅ Migrated photo for equipment ${item.equipment_id}`);
      console.log(`   Photo ID: ${newPhoto.id}`);
      console.log(`   Updated bag_equipment.selected_photo_id`);
    }
  }

  console.log('');
  console.log('=== Migration Complete ===');
  console.log(`✅ Successfully migrated: ${successCount} photos`);
  console.log(`⏭️  Skipped (already exists): ${skipCount} photos`);
  console.log(`❌ Errors: ${errorCount} photos`);
  console.log('');
  console.log('Note: The custom_photo_url field is kept for backward compatibility.');
  console.log('The equipment detail pages will now show these photos!');
}

migrateBagPhotosToEquipmentPhotos().catch(console.error);