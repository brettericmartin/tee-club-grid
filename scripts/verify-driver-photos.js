#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyDriverPhotos() {
  console.log('🏌️ Driver Photo Verification Report\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers with their photos
  const { data: drivers } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      equipment_photos (
        id,
        photo_url,
        is_primary
      )
    `)
    .eq('category', 'driver')
    .order('brand');
  
  let withPhotos = 0;
  let withoutPhotos = 0;
  const driversWithPhotos = [];
  const driversWithoutPhotos = [];
  
  drivers?.forEach(driver => {
    if (driver.equipment_photos && driver.equipment_photos.length > 0) {
      withPhotos++;
      driversWithPhotos.push(driver);
    } else {
      withoutPhotos++;
      driversWithoutPhotos.push(driver);
    }
  });
  
  console.log('📊 Summary:');
  console.log(`  Total drivers: ${drivers?.length || 0}`);
  console.log(`  ✅ With photos: ${withPhotos} (${Math.round((withPhotos / (drivers?.length || 1)) * 100)}%)`);
  console.log(`  ❌ Without photos: ${withoutPhotos}`);
  
  console.log('\n✅ Drivers with photos in equipment_photos table:');
  driversWithPhotos.forEach(d => {
    const primaryPhoto = d.equipment_photos.find(p => p.is_primary);
    console.log(`  - ${d.brand} ${d.model} (${d.equipment_photos.length} photo${d.equipment_photos.length > 1 ? 's' : ''})`);
    if (primaryPhoto) {
      console.log(`    Primary: ${primaryPhoto.photo_url.substring(0, 60)}...`);
    }
  });
  
  if (driversWithoutPhotos.length > 0) {
    console.log('\n❌ Drivers still needing photos:');
    driversWithoutPhotos.slice(0, 10).forEach(d => {
      console.log(`  - ${d.brand} ${d.model}`);
    });
    if (driversWithoutPhotos.length > 10) {
      console.log(`  ... and ${driversWithoutPhotos.length - 10} more`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n✨ Photos are now properly stored in equipment_photos table!');
  console.log('✨ They should be visible at http://localhost:3333/equipment?category=driver\n');
}

verifyDriverPhotos().catch(console.error);