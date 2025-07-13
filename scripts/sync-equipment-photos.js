import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncEquipmentPhotos() {
  console.log('Starting equipment photo sync...\n');
  
  try {
    // First, get all bag_equipment records with custom_photo_url
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        equipment_id,
        custom_photo_url,
        bag:user_bags!inner (
          user_id
        )
      `)
      .not('custom_photo_url', 'is', null);

    if (bagError) {
      console.error('Error fetching bag equipment:', bagError);
      return;
    }

    console.log(`Found ${bagEquipment?.length || 0} bag equipment items with custom photos\n`);

    if (!bagEquipment || bagEquipment.length === 0) {
      console.log('No custom photos to sync');
      return;
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // Process each custom photo
    for (const item of bagEquipment) {
      try {
        const userId = item.bag.user_id;
        const equipmentId = item.equipment_id;
        const photoUrl = item.custom_photo_url;

        // Check if this photo already exists in equipment_photos
        const { data: existing, error: checkError } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('user_id', userId)
          .eq('equipment_id', equipmentId)
          .eq('photo_url', photoUrl)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
          console.error(`Error checking existing photo: ${checkError.message}`);
          errors++;
          continue;
        }

        if (existing) {
          console.log(`Skipping duplicate photo for equipment ${equipmentId}`);
          skipped++;
          continue;
        }

        // Insert the photo into equipment_photos
        const { error: insertError } = await supabase
          .from('equipment_photos')
          .insert({
            user_id: userId,
            equipment_id: equipmentId,
            photo_url: photoUrl,
            source: 'user_upload',
            caption: 'Synced from user bag',
            is_primary: false
          });

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            console.log(`Photo already exists for equipment ${equipmentId}`);
            skipped++;
          } else {
            console.error(`Error inserting photo: ${insertError.message}`);
            errors++;
          }
        } else {
          console.log(`✓ Synced photo for equipment ${equipmentId}`);
          synced++;
        }

      } catch (error) {
        console.error(`Error processing item:`, error);
        errors++;
      }
    }

    console.log('\n=== Sync Summary ===');
    console.log(`Total items processed: ${bagEquipment.length}`);
    console.log(`Successfully synced: ${synced}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Verify the sync
    const { count } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'user_upload');

    console.log(`\nTotal user-uploaded photos in equipment_photos: ${count}`);

  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncEquipmentPhotos();