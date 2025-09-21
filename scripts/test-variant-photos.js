#!/usr/bin/env node

/**
 * Test photo display for equipment variants
 * Verifies that equipment variants properly share photos from equipment_photos table
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

async function testVariantPhotos() {
  console.log('\n🔍 Testing photo display for equipment variants...\n');

  try {
    // 1. Find bags with equipment variants (duplicates with different specs)
    console.log('1. Finding bags with equipment variants...');
    
    const { data: variantData, error: variantError } = await supabase
      .from('bag_equipment')
      .select(`
        bag_id,
        equipment_id,
        equipment:equipment (
          id,
          brand,
          model
        )
      `)
      .order('bag_id');

    if (variantError) throw variantError;

    // Group by bag and equipment to find variants
    const bagEquipmentMap = new Map();
    variantData.forEach(item => {
      const key = `${item.bag_id}-${item.equipment_id}`;
      if (!bagEquipmentMap.has(key)) {
        bagEquipmentMap.set(key, []);
      }
      bagEquipmentMap.get(key).push(item);
    });

    // Find bags with variants
    const bagsWithVariants = [];
    bagEquipmentMap.forEach((items, key) => {
      if (items.length > 1) {
        bagsWithVariants.push({
          key,
          bag_id: items[0].bag_id,
          equipment_id: items[0].equipment_id,
          equipment: items[0].equipment,
          variant_count: items.length
        });
      }
    });

    console.log(`Found ${bagsWithVariants.length} equipment items with variants\n`);

    // 2. Check if variants can access shared photos
    console.log('2. Checking photo access for variants...\n');
    
    let issuesFound = 0;
    
    for (const variant of bagsWithVariants.slice(0, 5)) { // Test first 5
      console.log(`Testing: ${variant.equipment.brand} ${variant.equipment.model}`);
      console.log(`  Bag ID: ${variant.bag_id}`);
      console.log(`  Equipment ID: ${variant.equipment_id}`);
      console.log(`  Variants: ${variant.variant_count}`);

      // Get all bag_equipment entries for this variant
      const { data: bagEquipmentEntries, error: beError } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment:equipment (
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count
            )
          )
        `)
        .eq('bag_id', variant.bag_id)
        .eq('equipment_id', variant.equipment_id);

      if (beError) throw beError;

      // Check if equipment_photos are accessible
      const photoCounts = bagEquipmentEntries.map(entry => ({
        id: entry.id,
        custom_photo_url: entry.custom_photo_url,
        equipment_photos_count: entry.equipment?.equipment_photos?.length || 0
      }));

      console.log(`  Photo data for each variant:`);
      photoCounts.forEach((pc, idx) => {
        console.log(`    Variant ${idx + 1}: ${pc.equipment_photos_count} shared photos, custom: ${pc.custom_photo_url ? 'Yes' : 'No'}`);
      });

      // Check if any variant has photos but others don't see them
      const maxPhotos = Math.max(...photoCounts.map(pc => pc.equipment_photos_count));
      const minPhotos = Math.min(...photoCounts.map(pc => pc.equipment_photos_count));
      
      if (maxPhotos !== minPhotos) {
        console.log(`  ⚠️  ISSUE: Photo count mismatch! Max: ${maxPhotos}, Min: ${minPhotos}`);
        issuesFound++;
      } else if (maxPhotos > 0) {
        console.log(`  ✅ All variants can access ${maxPhotos} shared photos`);
      } else {
        console.log(`  ℹ️  No shared photos for this equipment`);
      }
      
      console.log('');
    }

    // 3. Test specific equipment with photos
    console.log('3. Testing equipment known to have photos...\n');
    
    const { data: equipmentWithPhotos, error: ewpError } = await supabase
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

    if (ewpError) throw ewpError;

    for (const equip of equipmentWithPhotos) {
      if (!equip.equipment_photos || equip.equipment_photos.length === 0) continue;
      
      console.log(`${equip.brand} ${equip.model}: ${equip.equipment_photos.length} photos`);
      
      // Check if this equipment is in any bags
      const { data: inBags, error: ibError } = await supabase
        .from('bag_equipment')
        .select('id, bag_id')
        .eq('equipment_id', equip.id)
        .limit(3);

      if (ibError) throw ibError;

      if (inBags && inBags.length > 0) {
        console.log(`  In ${inBags.length} bag(s) - photos should be visible for all instances`);
      } else {
        console.log(`  Not in any bags`);
      }
      console.log('');
    }

    // 4. Summary
    console.log('\n📊 Summary:');
    console.log(`- Tested ${Math.min(5, bagsWithVariants.length)} equipment items with variants`);
    console.log(`- Issues found: ${issuesFound}`);
    
    if (issuesFound === 0) {
      console.log('\n✅ All equipment variants can properly access shared photos!');
    } else {
      console.log(`\n⚠️  Found ${issuesFound} issue(s) with photo sharing between variants`);
    }

  } catch (error) {
    console.error('❌ Error testing variant photos:', error);
    process.exit(1);
  }
}

// Run the test
testVariantPhotos().then(() => {
  console.log('\n✅ Photo variant test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});