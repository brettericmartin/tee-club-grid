#!/usr/bin/env node

/**
 * Sync ALL photos to equipment_photos table to ensure unified photo pool is complete
 * 
 * This script:
 * 1. Finds all custom_photo_urls in bag_equipment that aren't in equipment_photos
 * 2. Syncs them to the equipment_photos table
 * 3. Updates selected_photo_id to reference the synced photo
 * 4. Ensures ALL photos flow through the unified pool
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllPhotosToEquipment() {
  console.log('🔄 Starting comprehensive photo sync to equipment_photos...\n');

  try {
    // 1. First, get all unique custom_photo_urls that exist
    console.log('📋 Finding all custom photos in bag_equipment...');
    const { data: bagEquipmentWithPhotos, error: fetchError } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        custom_photo_url,
        selected_photo_id,
        equipment_id,
        bag:user_bags!bag_equipment_bag_id_fkey(user_id)
      `)
      .not('custom_photo_url', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${bagEquipmentWithPhotos?.length || 0} bag_equipment records with photos\n`);

    if (!bagEquipmentWithPhotos || bagEquipmentWithPhotos.length === 0) {
      console.log('✅ No custom photos to sync.');
      return;
    }

    // Group by unique photo URL + equipment_id combo
    const uniquePhotos = new Map();
    bagEquipmentWithPhotos.forEach(item => {
      if (item.custom_photo_url && item.equipment_id && item.bag?.user_id) {
        const key = `${item.equipment_id}::${item.custom_photo_url}`;
        if (!uniquePhotos.has(key)) {
          uniquePhotos.set(key, {
            equipment_id: item.equipment_id,
            photo_url: item.custom_photo_url,
            user_id: item.bag.user_id,
            bag_equipment_ids: [item.id]
          });
        } else {
          uniquePhotos.get(key).bag_equipment_ids.push(item.id);
        }
      }
    });

    console.log(`📸 Found ${uniquePhotos.size} unique photo+equipment combinations\n`);

    let syncedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    let updatedBagEquipmentCount = 0;

    // 2. Process each unique photo
    for (const [key, photoData] of uniquePhotos) {
      console.log(`🔄 Processing: ${photoData.photo_url.substring(photoData.photo_url.lastIndexOf('/') + 1)}`);
      
      try {
        // Check if this photo already exists in equipment_photos
        const { data: existingPhoto } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('equipment_id', photoData.equipment_id)
          .eq('photo_url', photoData.photo_url)
          .single();

        let photoId;

        if (existingPhoto) {
          photoId = existingPhoto.id;
          console.log(`   ✓ Photo already exists in equipment_photos: ${photoId}`);
          existingCount++;
        } else {
          // Add photo to equipment_photos
          const { data: newPhoto, error: insertError } = await supabase
            .from('equipment_photos')
            .insert({
              equipment_id: photoData.equipment_id,
              user_id: photoData.user_id,
              photo_url: photoData.photo_url,
              caption: 'Synced from user bag',
              is_primary: false,
              likes_count: 0
            })
            .select('id')
            .single();

          if (insertError) {
            // Try without source field if it fails
            const { data: retryPhoto, error: retryError } = await supabase
              .from('equipment_photos')
              .insert({
                equipment_id: photoData.equipment_id,
                user_id: photoData.user_id,
                photo_url: photoData.photo_url,
                caption: 'Synced from user bag',
                is_primary: false,
                likes_count: 0
              })
              .select('id')
              .single();

            if (retryError) {
              console.error(`   ❌ Error inserting photo: ${retryError.message}`);
              errorCount++;
              continue;
            }
            photoId = retryPhoto.id;
          } else {
            photoId = newPhoto.id;
          }
          
          console.log(`   ✅ Added to equipment_photos: ${photoId}`);
          syncedCount++;
        }

        // 3. Update all bag_equipment records to use selected_photo_id
        for (const bagEquipmentId of photoData.bag_equipment_ids) {
          const { error: updateError } = await supabase
            .from('bag_equipment')
            .update({ selected_photo_id: photoId })
            .eq('id', bagEquipmentId)
            .is('selected_photo_id', null); // Only update if not already set

          if (!updateError) {
            updatedBagEquipmentCount++;
            console.log(`   ✅ Updated bag_equipment ${bagEquipmentId} with selected_photo_id`);
          }
        }

      } catch (error) {
        console.error(`   ❌ Error processing photo:`, error.message);
        errorCount++;
      }
    }

    // 4. Summary
    console.log('\n📊 Sync Summary:');
    console.log(`✅ New photos synced: ${syncedCount}`);
    console.log(`📋 Already existed: ${existingCount}`);
    console.log(`🔄 Bag equipment updated: ${updatedBagEquipmentCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📸 Total unique photos: ${uniquePhotos.size}\n`);

    // 5. Verify the sync
    const { count: totalPhotos } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });

    const { count: bagEquipmentWithSelected } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('selected_photo_id', 'is', null);

    console.log('✅ Final Status:');
    console.log(`   Total photos in equipment_photos: ${totalPhotos}`);
    console.log(`   Bag equipment with selected_photo_id: ${bagEquipmentWithSelected}`);

    if (syncedCount > 0 || updatedBagEquipmentCount > 0) {
      console.log('\n🎉 Photos successfully synced to unified pool!');
    } else {
      console.log('\n✅ All photos were already in sync.');
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncAllPhotosToEquipment();