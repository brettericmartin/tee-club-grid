#!/usr/bin/env node

/**
 * Migration script to convert custom_photo_url to selected_photo_id approach
 * 
 * This script:
 * 1. Finds all bag_equipment records with custom_photo_url but no selected_photo_id
 * 2. Syncs these photos to the equipment_photos table
 * 3. Updates bag_equipment records to use selected_photo_id
 * 4. Preserves existing custom_photo_url during transition period
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

async function migrateCustomPhotos() {
  console.log('🔄 Starting migration of custom_photo_url to selected_photo_id...\n');

  try {
    // 1. Find all bag_equipment records with custom_photo_url but no selected_photo_id
    console.log('📋 Finding bag_equipment records with custom photos...');
    const { data: bagEquipmentWithCustomPhotos, error: fetchError } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        custom_photo_url,
        selected_photo_id,
        equipment_id,
        bag_id,
        added_at,
        bag:user_bags(user_id)
      `)
      .not('custom_photo_url', 'is', null)
      .is('selected_photo_id', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${bagEquipmentWithCustomPhotos.length} records to migrate\n`);

    if (bagEquipmentWithCustomPhotos.length === 0) {
      console.log('✅ No records to migrate. All custom photos are already migrated.');
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 2. Process each record
    for (const bagEquipment of bagEquipmentWithCustomPhotos) {
      const { id, custom_photo_url, equipment_id, bag } = bagEquipment;
      
      if (!bag?.user_id) {
        console.log(`⚠️  Skipping bag_equipment ${id}: No user_id found`);
        skipCount++;
        continue;
      }

      console.log(`🔄 Processing bag_equipment ${id} with photo: ${custom_photo_url}`);

      try {
        // Check if this photo already exists in equipment_photos
        const { data: existingPhoto } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('equipment_id', equipment_id)
          .eq('photo_url', custom_photo_url)
          .single();

        let photoId;

        if (existingPhoto) {
          // Photo already exists, use its ID
          photoId = existingPhoto.id;
          console.log(`   📷 Photo already exists in equipment_photos: ${photoId}`);
        } else {
          // Add photo to equipment_photos
          const { data: newPhoto, error: insertError } = await supabase
            .from('equipment_photos')
            .insert({
              equipment_id: equipment_id,
              user_id: bag.user_id,
              photo_url: custom_photo_url,
              caption: 'Migrated from custom photo',
              is_primary: false,
              likes_count: 0,
              source: 'custom_migration'
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`   ❌ Error inserting photo: ${insertError.message}`);
            errorCount++;
            continue;
          }

          photoId = newPhoto.id;
          console.log(`   ✅ Created new equipment_photo: ${photoId}`);
        }

        // Update bag_equipment to use selected_photo_id
        const { error: updateError } = await supabase
          .from('bag_equipment')
          .update({ selected_photo_id: photoId })
          .eq('id', id);

        if (updateError) {
          console.error(`   ❌ Error updating bag_equipment: ${updateError.message}`);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Updated bag_equipment ${id} to use selected_photo_id: ${photoId}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing bag_equipment ${id}:`, error.message);
        errorCount++;
      }
    }

    // 3. Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} records`);
    console.log(`⚠️  Skipped: ${skipCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`📋 Total processed: ${bagEquipmentWithCustomPhotos.length} records\n`);

    if (successCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('📝 Note: custom_photo_url fields are preserved for rollback safety');
      console.log('   You can remove them later after verifying the migration');
    }

    if (errorCount > 0) {
      console.log('⚠️  Some records failed to migrate. Check the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateCustomPhotos();