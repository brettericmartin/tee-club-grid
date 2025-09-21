#!/usr/bin/env node

/**
 * Test photo flow between equipment pages and bags
 * Verifies that photos uploaded from any source appear everywhere
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPhotoFlow() {
  console.log('\n🔍 TESTING PHOTO FLOW BETWEEN EQUIPMENT AND BAGS\n');
  console.log('=' .repeat(60));

  const results = {
    tests: 0,
    passed: 0,
    failed: 0,
    issues: []
  };

  try {
    // Test 1: Equipment photos visible in bags
    console.log('\n1. TEST: Equipment photos visible in user bags');
    console.log('-'.repeat(40));
    
    // Find equipment with photos
    const { data: equipmentWithPhotos } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        equipment_photos (
          id,
          photo_url
        )
      `)
      .not('equipment_photos', 'is', null)
      .limit(5);

    console.log(`Found ${equipmentWithPhotos?.length || 0} equipment items with photos`);

    for (const equipment of equipmentWithPhotos || []) {
      results.tests++;
      
      // Check if this equipment is in any bags
      const { data: bagEquipment } = await supabase
        .from('bag_equipment')
        .select(`
          id,
          custom_photo_url,
          bag_id,
          user_bags!inner (
            user_id
          )
        `)
        .eq('equipment_id', equipment.id)
        .limit(1);

      if (bagEquipment && bagEquipment.length > 0) {
        const photoCount = equipment.equipment_photos?.length || 0;
        console.log(`✓ ${equipment.brand} ${equipment.model}: ${photoCount} photos available`);
        
        // Verify at least one photo can be selected
        if (photoCount > 0) {
          results.passed++;
          console.log(`  ✅ Photos should be visible in bag for user ${bagEquipment[0].user_bags.user_id.slice(0, 8)}`);
        } else {
          results.failed++;
          results.issues.push(`${equipment.brand} ${equipment.model} has no photos despite being in equipment_photos`);
        }
      } else {
        console.log(`  ℹ️  Equipment not in any bags (can't test visibility)`);
      }
    }

    // Test 2: Bag custom photos visible in equipment
    console.log('\n2. TEST: Bag custom photos synced to equipment_photos');
    console.log('-'.repeat(40));
    
    const { data: bagEquipmentWithPhotos } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        custom_photo_url,
        equipment_id,
        equipment (
          brand,
          model
        )
      `)
      .not('custom_photo_url', 'is', null)
      .limit(5);

    console.log(`Found ${bagEquipmentWithPhotos?.length || 0} bag items with custom photos`);

    for (const bagItem of bagEquipmentWithPhotos || []) {
      results.tests++;
      
      // Check if photo exists in equipment_photos
      const { data: photoInEquipment } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('equipment_id', bagItem.equipment_id)
        .eq('photo_url', bagItem.custom_photo_url)
        .single();

      if (photoInEquipment) {
        results.passed++;
        console.log(`✅ ${bagItem.equipment?.brand} ${bagItem.equipment?.model}: Custom photo synced`);
      } else {
        results.failed++;
        console.log(`❌ ${bagItem.equipment?.brand} ${bagItem.equipment?.model}: Custom photo NOT in equipment_photos`);
        results.issues.push(`Bag item ${bagItem.id} photo not synced`);
      }
    }

    // Test 3: Feed photos synced everywhere
    console.log('\n3. TEST: Feed photos synced to equipment_photos');
    console.log('-'.repeat(40));
    
    const { data: feedPosts } = await supabase
      .from('feed_posts')
      .select(`
        id,
        equipment_id,
        media_urls,
        user_id,
        equipment (
          brand,
          model
        )
      `)
      .not('equipment_id', 'is', null)
      .not('media_urls', 'is', null)
      .limit(5);

    console.log(`Found ${feedPosts?.length || 0} feed posts with equipment photos`);

    for (const post of feedPosts || []) {
      results.tests++;
      const mediaUrl = post.media_urls?.[0];
      
      if (mediaUrl) {
        // Check if in equipment_photos
        const { data: inEquipmentPhotos } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('equipment_id', post.equipment_id)
          .eq('photo_url', mediaUrl)
          .single();

        if (inEquipmentPhotos) {
          results.passed++;
          console.log(`✅ ${post.equipment?.brand} ${post.equipment?.model}: Feed photo synced`);
        } else {
          results.failed++;
          console.log(`❌ ${post.equipment?.brand} ${post.equipment?.model}: Feed photo NOT synced`);
          results.issues.push(`Feed post ${post.id} photo not in equipment_photos`);
        }
      }
    }

    // Test 4: Photo counts match
    console.log('\n4. TEST: Photo counts consistency');
    console.log('-'.repeat(40));
    
    // Sample some equipment
    const { data: sampleEquipment } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(5);

    for (const equip of sampleEquipment || []) {
      results.tests++;
      
      // Count photos in equipment_photos
      const { count: photoCount } = await supabase
        .from('equipment_photos')
        .select('*', { count: 'exact', head: true })
        .eq('equipment_id', equip.id);

      // Count unique photos in bag_equipment
      const { data: bagPhotos } = await supabase
        .from('bag_equipment')
        .select('custom_photo_url')
        .eq('equipment_id', equip.id)
        .not('custom_photo_url', 'is', null);

      const uniqueBagPhotos = [...new Set(bagPhotos?.map(b => b.custom_photo_url) || [])];
      
      console.log(`${equip.brand} ${equip.model}:`);
      console.log(`  Equipment photos: ${photoCount || 0}`);
      console.log(`  Unique bag photos: ${uniqueBagPhotos.length}`);
      
      // All bag photos should be in equipment_photos
      if (uniqueBagPhotos.length > 0 && (photoCount || 0) >= uniqueBagPhotos.length) {
        results.passed++;
        console.log(`  ✅ Photo counts consistent`);
      } else if (uniqueBagPhotos.length === 0 && photoCount === 0) {
        results.passed++;
        console.log(`  ✅ No photos (consistent)`);
      } else if (uniqueBagPhotos.length > (photoCount || 0)) {
        results.failed++;
        console.log(`  ❌ Bag photos not all synced to equipment_photos`);
        results.issues.push(`${equip.brand} ${equip.model}: ${uniqueBagPhotos.length} bag photos but only ${photoCount} in equipment_photos`);
      } else {
        results.passed++;
        console.log(`  ✅ More photos in equipment_photos (from other users)`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHOTO FLOW TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\nTests Run: ${results.tests}`);
    console.log(`✅ Passed: ${results.passed} (${((results.passed/results.tests)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.failed} (${((results.failed/results.tests)*100).toFixed(1)}%)`);
    
    if (results.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      results.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
      
      console.log('\n🔧 Recommended Actions:');
      console.log('  1. Run sync-feed-photos.js to sync existing photos');
      console.log('  2. Verify all upload components use sync functions');
      console.log('  3. Check unified photo service is used everywhere');
    } else {
      console.log('\n✅ Photo flow is working perfectly!');
      console.log('Photos are properly synced between equipment pages and bags.');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

// Run test
testPhotoFlow().then(() => {
  console.log('\n✅ Photo flow test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});