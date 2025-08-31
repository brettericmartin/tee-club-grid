#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Use anon key to test what public users see
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🔍 CHECKING EQUIPMENT IMAGES FOR BRETT\'S BAG');
console.log('================================================================================\n');

const BRETT_BAG_ID = "f506f87e-223e-4fa4-beee-f0094915a965";

async function checkEquipmentImages() {
  // Test 1: Check if we can fetch the bag data as anonymous
  console.log('📋 Test 1: Fetching bag data as anonymous user');
  const { data: bagData, error: bagError } = await supabase
    .from('user_bags')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        display_name
      ),
      bag_equipment (
        id,
        equipment_id,
        custom_photo_url,
        equipment:equipment_id (
          id,
          brand,
          model,
          category,
          image_url
        )
      )
    `)
    .eq('id', BRETT_BAG_ID)
    .single();

  if (bagError) {
    console.log(`   ❌ Cannot fetch bag: ${bagError.message}`);
    return;
  }

  console.log(`   ✅ Bag fetched: ${bagData.name}`);
  console.log(`   Equipment count: ${bagData.bag_equipment?.length || 0}`);

  // Test 2: Check equipment image URLs
  console.log('\n📋 Test 2: Checking equipment image URLs');
  
  if (bagData.bag_equipment && bagData.bag_equipment.length > 0) {
    for (const item of bagData.bag_equipment.slice(0, 5)) { // Check first 5
      const equipment = item.equipment;
      console.log(`\n   ${equipment.brand} ${equipment.model}:`);
      console.log(`   - image_url: ${equipment.image_url || 'NULL'}`);
      console.log(`   - custom_photo_url: ${item.custom_photo_url || 'NULL'}`);
      
      // Try to fetch equipment_photos for this equipment
      const { data: photos, error: photoError } = await supabase
        .from('equipment_photos')
        .select('photo_url')
        .eq('equipment_id', equipment.id)
        .limit(1);
      
      if (photoError) {
        console.log(`   - equipment_photos: ❌ Cannot access (${photoError.message})`);
      } else {
        console.log(`   - equipment_photos: ${photos?.length || 0} photos found`);
        if (photos && photos.length > 0) {
          console.log(`     First photo: ${photos[0].photo_url}`);
        }
      }
    }
  }

  // Test 3: Check if equipment table has any images
  console.log('\n📋 Test 3: Checking equipment table for any images');
  const { data: equipmentWithImages, error: eqError } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .not('image_url', 'is', null)
    .limit(5);

  if (eqError) {
    console.log(`   ❌ Cannot query equipment: ${eqError.message}`);
  } else {
    console.log(`   Found ${equipmentWithImages?.length || 0} equipment with image_url`);
    if (equipmentWithImages && equipmentWithImages.length > 0) {
      equipmentWithImages.forEach(eq => {
        console.log(`   - ${eq.brand} ${eq.model}: ${eq.image_url.substring(0, 50)}...`);
      });
    }
  }

  // Test 4: Check equipment_photos table directly
  console.log('\n📋 Test 4: Checking equipment_photos table');
  const { data: allPhotos, count, error: photosError } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });

  if (photosError) {
    console.log(`   ❌ Cannot access equipment_photos: ${photosError.message}`);
  } else {
    console.log(`   ✅ Total photos in equipment_photos table: ${count || 0}`);
  }

  console.log('\n================================================================================');
  console.log('💡 DIAGNOSIS');
  console.log('================================================================================\n');
  
  console.log('If images are missing, it could be:');
  console.log('1. Equipment table has NULL image_urls');
  console.log('2. RLS policies blocking anonymous access to equipment_photos');
  console.log('3. Image URLs are broken/invalid');
  console.log('4. Equipment photos were never uploaded');
}

checkEquipmentImages();