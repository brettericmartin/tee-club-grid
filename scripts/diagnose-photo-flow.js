#!/usr/bin/env node

/**
 * Diagnose photo flow issues between equipment and bags
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

async function diagnosePhotoFlow() {
  console.log('\n🔍 DIAGNOSING PHOTO FLOW ISSUES\n');
  console.log('=' .repeat(60));

  const issues = [];
  
  try {
    // 1. Check equipment_photos table
    console.log('\n1. EQUIPMENT_PHOTOS TABLE STATUS');
    console.log('-'.repeat(40));
    
    const { data: photoStats, error: photoError } = await supabase
      .from('equipment_photos')
      .select('equipment_id, count')
      .select('equipment_id')
      .limit(0); // Just get count
      
    const { count: totalPhotos } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });
      
    console.log(`Total equipment photos: ${totalPhotos}`);
    
    // Check for orphaned photos
    const { data: orphanedPhotos } = await supabase
      .from('equipment_photos')
      .select('id, photo_url, equipment_id')
      .is('equipment_id', null);
      
    if (orphanedPhotos && orphanedPhotos.length > 0) {
      console.log(`⚠️  Found ${orphanedPhotos.length} orphaned photos without equipment_id`);
      issues.push(`${orphanedPhotos.length} orphaned photos in equipment_photos`);
    }

    // 2. Check bag_equipment with custom photos
    console.log('\n2. BAG_EQUIPMENT CUSTOM PHOTOS');
    console.log('-'.repeat(40));
    
    const { count: bagEquipmentWithPhotos } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('custom_photo_url', 'is', null);
      
    console.log(`Bag equipment items with custom photos: ${bagEquipmentWithPhotos}`);
    
    // Check if these photos exist in equipment_photos
    const { data: bagEquipmentSample } = await supabase
      .from('bag_equipment')
      .select('id, equipment_id, custom_photo_url')
      .not('custom_photo_url', 'is', null)
      .limit(10);
      
    let missingSyncCount = 0;
    for (const item of bagEquipmentSample || []) {
      const { data: inEquipmentPhotos } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('equipment_id', item.equipment_id)
        .eq('photo_url', item.custom_photo_url)
        .single();
        
      if (!inEquipmentPhotos) {
        missingSyncCount++;
        console.log(`⚠️  Bag equipment ${item.id.slice(0, 8)} photo not in equipment_photos`);
      }
    }
    
    if (missingSyncCount > 0) {
      issues.push(`${missingSyncCount}/10 sampled bag photos not synced to equipment_photos`);
    }

    // 3. Check feed posts with equipment
    console.log('\n3. FEED POST PHOTOS');
    console.log('-'.repeat(40));
    
    const { data: feedPostsWithEquipment } = await supabase
      .from('feed_posts')
      .select('id, equipment_id, media_urls')
      .not('equipment_id', 'is', null)
      .not('media_urls', 'is', null)
      .limit(10);
      
    console.log(`Checking ${feedPostsWithEquipment?.length || 0} feed posts with equipment...`);
    
    let feedSyncIssues = 0;
    for (const post of feedPostsWithEquipment || []) {
      const mediaUrl = post.media_urls?.[0];
      if (mediaUrl) {
        const { data: inEquipmentPhotos } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('equipment_id', post.equipment_id)
          .eq('photo_url', mediaUrl)
          .single();
          
        if (!inEquipmentPhotos) {
          feedSyncIssues++;
          console.log(`⚠️  Feed post ${post.id.slice(0, 8)} photo not in equipment_photos`);
        }
      }
    }
    
    if (feedSyncIssues > 0) {
      issues.push(`${feedSyncIssues}/10 sampled feed photos not synced to equipment_photos`);
    }

    // 4. Check equipment with no photos but have bag photos
    console.log('\n4. EQUIPMENT MISSING PHOTOS');
    console.log('-'.repeat(40));
    
    // Get equipment that's in bags with custom photos
    const { data: equipmentInBags } = await supabase
      .from('bag_equipment')
      .select('equipment_id, custom_photo_url')
      .not('custom_photo_url', 'is', null)
      .not('custom_photo_url', 'eq', '');
      
    const uniqueEquipmentIds = [...new Set(equipmentInBags?.map(e => e.equipment_id) || [])];
    
    console.log(`Checking ${uniqueEquipmentIds.length} equipment items in bags with photos...`);
    
    let missingPhotosCount = 0;
    for (const equipmentId of uniqueEquipmentIds.slice(0, 10)) {
      const { count } = await supabase
        .from('equipment_photos')
        .select('*', { count: 'exact', head: true })
        .eq('equipment_id', equipmentId);
        
      if (count === 0) {
        missingPhotosCount++;
        const { data: equipmentInfo } = await supabase
          .from('equipment')
          .select('brand, model')
          .eq('id', equipmentId)
          .single();
          
        console.log(`⚠️  ${equipmentInfo?.brand} ${equipmentInfo?.model} has bag photos but no equipment_photos`);
      }
    }
    
    if (missingPhotosCount > 0) {
      issues.push(`${missingPhotosCount}/10 equipment items have bag photos but no equipment_photos`);
    }

    // 5. Check the reverse - equipment_photos not showing in bags
    console.log('\n5. EQUIPMENT PHOTOS NOT SHOWING IN BAGS');
    console.log('-'.repeat(40));
    
    const { data: equipmentWithPhotos } = await supabase
      .from('equipment_photos')
      .select('equipment_id')
      .limit(100);
      
    const uniqueEquipmentWithPhotos = [...new Set(equipmentWithPhotos?.map(e => e.equipment_id) || [])];
    
    let notShowingInBags = 0;
    for (const equipmentId of uniqueEquipmentWithPhotos.slice(0, 10)) {
      // Check if this equipment is in any bags
      const { data: inBags } = await supabase
        .from('bag_equipment')
        .select('id, custom_photo_url')
        .eq('equipment_id', equipmentId)
        .limit(1);
        
      if (inBags && inBags.length > 0 && !inBags[0].custom_photo_url) {
        notShowingInBags++;
        console.log(`⚠️  Equipment ${equipmentId.slice(0, 8)} has photos but bag_equipment has no custom_photo_url`);
      }
    }
    
    if (notShowingInBags > 0) {
      issues.push(`${notShowingInBags}/10 equipment with photos not showing in bags`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (issues.length === 0) {
      console.log('\n✅ No photo flow issues detected!');
    } else {
      console.log('\n⚠️  ISSUES FOUND:');
      issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('  1. Run sync-feed-photos.js to sync feed photos');
      console.log('  2. Ensure all photo uploads call syncFeedPhotoToBagEquipment');
      console.log('  3. Update Equipment page to use unified photo service');
      console.log('  4. Ensure bag queries include equipment_photos relation');
    }

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
    process.exit(1);
  }
}

// Run diagnosis
diagnosePhotoFlow().then(() => {
  console.log('\n✅ Diagnosis completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});