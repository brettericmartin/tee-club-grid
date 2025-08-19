#!/usr/bin/env node
import 'dotenv/config';
import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 TESTING BAG LOADING RELIABILITY');
console.log('==================================================\n');

async function testBagLoading() {
  let successCount = 0;
  let failureCount = 0;
  const errors = [];
  
  // Test 1: Load bags with the simplified query
  console.log('1. Testing simplified bag query:');
  console.log('--------------------------------');
  
  for (let i = 0; i < 5; i++) {
    try {
      const { data, error } = await supabase
        .from('user_bags')
        .select(`
          id,
          name,
          bag_type,
          background_image,
          created_at,
          user_id,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          ),
          bag_equipment (
            id,
            custom_photo_url,
            is_featured,
            equipment_id,
            equipment:equipment (
              id,
              brand,
              model,
              category,
              image_url
            )
          )
        `)
        .limit(3);
      
      if (error) {
        failureCount++;
        errors.push(`Attempt ${i + 1}: ${error.message}`);
        console.log(`   ❌ Attempt ${i + 1}: Failed - ${error.message}`);
      } else {
        successCount++;
        console.log(`   ✅ Attempt ${i + 1}: Success - ${data?.length || 0} bags loaded`);
      }
    } catch (err) {
      failureCount++;
      errors.push(`Attempt ${i + 1}: ${err.message}`);
      console.log(`   ❌ Attempt ${i + 1}: Error - ${err.message}`);
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nResults: ${successCount}/5 successful, ${failureCount}/5 failed`);
  
  // Test 2: Test individual bag loading
  console.log('\n2. Testing individual bag load:');
  console.log('--------------------------------');
  
  const { data: sampleBag } = await supabase
    .from('user_bags')
    .select('id')
    .limit(1)
    .single();
  
  if (sampleBag) {
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from('user_bags')
          .select(`
            *,
            profiles (*),
            bag_equipment (
              *,
              equipment:equipment (*)
            )
          `)
          .eq('id', sampleBag.id)
          .single();
        
        if (error) {
          console.log(`   ❌ Attempt ${i + 1}: Failed - ${error.message}`);
        } else {
          const hasCustomPhotos = data.bag_equipment?.some(item => item.custom_photo_url);
          console.log(`   ✅ Attempt ${i + 1}: Success - ${data.bag_equipment?.length || 0} items`);
          if (hasCustomPhotos) {
            console.log(`      📸 Has custom photos`);
          }
        }
      } catch (err) {
        console.log(`   ❌ Attempt ${i + 1}: Error - ${err.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Test 3: Check custom photo availability
  console.log('\n3. Checking custom photo data:');
  console.log('-------------------------------');
  
  const { data: bagsWithPhotos } = await supabase
    .from('bag_equipment')
    .select(`
      id,
      custom_photo_url,
      equipment:equipment (
        brand,
        model,
        image_url
      )
    `)
    .not('custom_photo_url', 'is', null)
    .limit(5);
  
  if (bagsWithPhotos && bagsWithPhotos.length > 0) {
    console.log(`✅ Found ${bagsWithPhotos.length} items with custom photos`);
    bagsWithPhotos.forEach(item => {
      const photoType = item.custom_photo_url ? 'CUSTOM' : 'DEFAULT';
      console.log(`   - ${item.equipment.brand} ${item.equipment.model}: ${photoType}`);
    });
  } else {
    console.log('⚠️  No custom photos found in bag_equipment');
  }
  
  // Summary
  console.log('\n📊 RELIABILITY SUMMARY:');
  console.log('------------------------');
  if (failureCount === 0) {
    console.log('✅ All queries succeeded - bag loading is stable');
  } else {
    console.log(`⚠️  ${failureCount} queries failed - potential reliability issues`);
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
    }
  }
  
  console.log('\n✅ BAG LOADING TEST COMPLETE');
}

// Run the test
testBagLoading().catch(console.error);