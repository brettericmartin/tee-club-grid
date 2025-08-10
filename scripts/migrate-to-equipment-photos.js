#!/usr/bin/env node

/**
 * Migrate scraped images from equipment.image_url to equipment_photos table
 * This ensures they show up in the UI which pulls from equipment_photos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateToEquipmentPhotos() {
  console.log('📸 Migrating Driver Photos to equipment_photos Table\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers with image_url that contains our scraped images
  const { data: drivers, error } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .eq('category', 'driver')
    .not('image_url', 'is', null)
    .like('image_url', '%equipment-images%');  // Only our scraped images
  
  if (error) {
    console.error('Error fetching drivers:', error);
    return;
  }
  
  console.log(`Found ${drivers.length} drivers with scraped images\n`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const driver of drivers) {
    console.log(`Processing: ${driver.brand} ${driver.model}`);
    
    // Check if this equipment already has photos in equipment_photos
    const { data: existingPhotos } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('equipment_id', driver.id)
      .eq('photo_url', driver.image_url);
    
    if (existingPhotos && existingPhotos.length > 0) {
      console.log(`  ⏭️ Already exists in equipment_photos`);
      skipped++;
      continue;
    }
    
    // Create a system user ID for scraped photos
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    
    // Insert into equipment_photos
    const { error: insertError } = await supabase
      .from('equipment_photos')
      .insert({
        equipment_id: driver.id,
        photo_url: driver.image_url,
        uploaded_by: systemUserId, // System user for scraped images
        is_primary: true,  // Make these primary since they're official images
        likes_count: 0,
        source: 'scraped', // Track that these are scraped
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      // Try without the system user ID if it fails
      const { error: retryError } = await supabase
        .from('equipment_photos')
        .insert({
          equipment_id: driver.id,
          photo_url: driver.image_url,
          is_primary: true,
          likes_count: 0,
          created_at: new Date().toISOString()
        });
      
      if (retryError) {
        console.log(`  ❌ Failed: ${retryError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Added to equipment_photos (without user)`);
        created++;
      }
    } else {
      console.log(`  ✅ Added to equipment_photos`);
      created++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Created: ${created} new photo records`);
  console.log(`  ⏭️ Skipped: ${skipped} (already existed)`);
  console.log(`  ❌ Failed: ${failed}`);
  
  // Verify the results
  const { count } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true })
    .in('equipment_id', drivers.map(d => d.id));
  
  console.log(`\n✨ Total photos for these drivers: ${count}`);
  console.log('✨ Migration complete!\n');
}

migrateToEquipmentPhotos().catch(console.error);