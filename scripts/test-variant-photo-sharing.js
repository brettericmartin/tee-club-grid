#!/usr/bin/env node

/**
 * Test photo sharing between equipment variants
 * Specifically tests the case where a user has 2 of the same wood
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testVariantPhotoSharing() {
  console.log('\n🔍 TESTING VARIANT PHOTO SHARING\n');
  console.log('=' .repeat(60));
  
  try {
    // Find brett.eric.martin's profile
    console.log('1. Finding brett.eric.martin profile...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', 'brett.eric.martin')
      .single();
      
    if (!profile) {
      console.log('❌ Could not find brett.eric.martin profile');
      return;
    }
    
    console.log(`✅ Found profile: ${profile.username} (${profile.id.slice(0, 8)}...)`);
    
    // Find their bags
    console.log('\n2. Finding their bags...');
    const { data: bags } = await supabase
      .from('user_bags')
      .select('id, name')
      .eq('user_id', profile.id);
      
    if (!bags || bags.length === 0) {
      console.log('❌ Could not find any bags');
      return;
    }
    
    console.log(`✅ Found ${bags.length} bag(s)`);
    
    for (const bag of bags) {
      console.log(`\n📦 Checking bag: ${bag.name} (${bag.id.slice(0, 8)}...)`);
      
      // Find duplicate equipment (2 of the same wood)
      console.log('  Looking for duplicate equipment (variants)...');
      const { data: bagEquipment } = await supabase
        .from('bag_equipment')
      .select(`
        id,
        equipment_id,
        custom_photo_url,
        custom_specs,
        equipment (
          id,
          brand,
          model,
          category
        )
      `)
      .eq('bag_id', bag.id)
      .order('equipment_id');
      
    // Find duplicates
    const equipmentCounts = {};
    const variants = [];
    
    bagEquipment?.forEach(item => {
      if (!equipmentCounts[item.equipment_id]) {
        equipmentCounts[item.equipment_id] = [];
      }
      equipmentCounts[item.equipment_id].push(item);
    });
    
    Object.entries(equipmentCounts).forEach(([equipmentId, items]) => {
      if (items.length > 1) {
        variants.push({
          equipment: items[0].equipment,
          variants: items,
          count: items.length
        });
      }
    });
    
    if (variants.length === 0) {
      console.log('  ℹ️  No duplicate equipment found in bag');
      continue; // Continue to next bag instead of returning
    }
    
    console.log(`✅ Found ${variants.length} equipment items with variants:\n`);
    
    // Check photo sharing for each variant
    for (const variant of variants) {
      console.log(`${variant.equipment.brand} ${variant.equipment.model} (${variant.equipment.category}):`);
      console.log(`  - ${variant.count} instances in bag`);
      
      // Check photos for each instance
      let allCustomPhotos = [];
      variant.variants.forEach((v, idx) => {
        console.log(`  - Variant ${idx + 1}:`);
        console.log(`      ID: ${v.id.slice(0, 8)}...`);
        console.log(`      Custom photo: ${v.custom_photo_url ? 'Yes' : 'No'}`);
        if (v.custom_specs?.loft) {
          console.log(`      Loft: ${v.custom_specs.loft}`);
        }
        
        if (v.custom_photo_url) {
          allCustomPhotos.push(v.custom_photo_url);
        }
      });
      
      // Check equipment_photos table
      const { data: equipmentPhotos, count } = await supabase
        .from('equipment_photos')
        .select('photo_url', { count: 'exact' })
        .eq('equipment_id', variant.equipment.id);
        
      console.log(`  - Total photos in equipment_photos: ${count || 0}`);
      
      // Check if custom photos are synced
      let missingSync = [];
      for (const customUrl of allCustomPhotos) {
        const found = equipmentPhotos?.find(p => p.photo_url === customUrl);
        if (!found) {
          missingSync.push(customUrl);
        }
      }
      
      if (missingSync.length > 0) {
        console.log(`  ❌ ${missingSync.length} custom photo(s) NOT in equipment_photos!`);
        console.log(`     This means variants won't see each other's photos`);
      } else if (allCustomPhotos.length > 0) {
        console.log(`  ✅ All custom photos are synced to equipment_photos`);
      }
      
      // THE KEY ISSUE: Check if modal would show all photos
      console.log(`\n  📱 Modal behavior check:`);
      console.log(`     - Modal will show ${count || 0} equipment_photos`);
      console.log(`     - Modal will show current variant's custom_photo_url`);
      console.log(`     - Modal will NOT show other variant's custom_photo_url`);
      
      if (variant.count > 1 && allCustomPhotos.length > 1) {
        console.log(`  ⚠️  PROBLEM: Each variant modal won't see photos from other variants!`);
      }
      
        console.log('');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 ANALYSIS:');
    console.log('The BagEquipmentModal needs to:');
    console.log('1. Load ALL custom_photo_urls from ALL variants of the same equipment');
    console.log('2. Not just the current variant\'s custom_photo_url');
    console.log('3. This requires querying bag_equipment for all variants when opening modal');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run test
testVariantPhotoSharing().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});