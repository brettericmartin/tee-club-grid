#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🔍 TESTING EXACT FRONTEND QUERIES');
console.log('================================\n');

async function testFrontendQueries() {
  try {
    // Create anon client like the frontend uses
    const { createClient } = await import('@supabase/supabase-js');
    const frontendClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    console.log('1. TESTING loadBags() QUERY...\n');
    
    // This is the exact query from MyBagSupabase.tsx loadBags()
    const testUserId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // From our audit
    
    console.log(`Testing with user ID: ${testUserId}`);
    
    try {
      const { data: userBags, error } = await frontendClient
        .from('user_bags')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('user_id', testUserId)
        .order('created_at', { ascending: true });

      if (error) {
        console.log(`❌ LOAD BAGS FAILED: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${error.details}`);
      } else {
        console.log(`✅ Load bags works: ${userBags?.length || 0} bags found`);
        if (userBags && userBags.length > 0) {
          console.log(`   Sample: "${userBags[0].name}" (${userBags[0].id})`);
        }
      }
    } catch (e) {
      console.log(`❌ Load bags exception: ${e.message}`);
    }

    console.log('\n2. TESTING loadBagEquipment() QUERY...\n');
    
    // Get a bag ID to test with
    const { data: testBags } = await frontendClient
      .from('user_bags')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);
      
    if (!testBags || testBags.length === 0) {
      console.log('❌ No test bags found');
      return;
    }
    
    const testBagId = testBags[0].id;
    console.log(`Testing with bag ID: ${testBagId}`);
    
    // This is the exact query from MyBagSupabase.tsx loadBagEquipment()
    try {
      const { data, error } = await frontendClient
        .from('bag_equipment')
        .select(`
          *,
          equipment(
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        `)
        .eq('bag_id', testBagId)
        .order('added_at');

      if (error) {
        console.log(`❌ LOAD BAG EQUIPMENT FAILED: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${error.details}`);
        console.log('   🚨 THIS IS THE LOADING ISSUE!');
        
        // Try simpler version
        console.log('\n   Trying simpler query...');
        const { data: simpleData, error: simpleError } = await frontendClient
          .from('bag_equipment')
          .select('*')
          .eq('bag_id', testBagId);
          
        if (simpleError) {
          console.log(`   ❌ Simple query also fails: ${simpleError.message}`);
        } else {
          console.log(`   ✅ Simple query works: ${simpleData?.length || 0} items`);
          console.log('   Issue is with the JOIN to equipment table');
        }
      } else {
        console.log(`✅ Load bag equipment works: ${data?.length || 0} items found`);
        if (data && data.length > 0) {
          const item = data[0];
          console.log(`   Sample: ${item.equipment?.brand} ${item.equipment?.model}`);
          console.log(`   Photos: ${item.equipment?.equipment_photos?.length || 0}`);
        }
      }
    } catch (e) {
      console.log(`❌ Load bag equipment exception: ${e.message}`);
    }

    console.log('\n3. TESTING WITH AUTHENTICATED USER...\n');
    
    // Try to simulate an authenticated session
    console.log('Testing with auth session simulation...');
    
    // Let's see if there's any actual user we can test with
    const { data: profiles } = await frontendClient
      .from('profiles')
      .select('id, username')
      .limit(3);
      
    console.log(`Found profiles: ${profiles?.length || 0}`);
    profiles?.forEach(profile => {
      console.log(`  - ${profile.username} (${profile.id})`);
    });

    console.log('\n4. CHECKING ORDER BY CLAUSE...\n');
    
    // The order by 'added_at' might be the issue
    try {
      console.log('Testing query without ORDER BY...');
      const { data, error } = await frontendClient
        .from('bag_equipment')
        .select(`
          *,
          equipment(
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        `)
        .eq('bag_id', testBagId);

      if (error) {
        console.log(`❌ No ORDER BY still fails: ${error.message}`);
      } else {
        console.log(`✅ No ORDER BY works: ${data?.length || 0} items`);
        
        // Check if 'added_at' column exists
        console.log('\nChecking if added_at column exists...');
        try {
          const { data: withOrder, error: orderError } = await frontendClient
            .from('bag_equipment')
            .select('*')
            .eq('bag_id', testBagId)
            .order('added_at');
            
          if (orderError) {
            console.log(`❌ ORDER BY added_at fails: ${orderError.message}`);
            console.log('   🚨 added_at column might not exist!');
            
            // Try with created_at instead
            const { data: createdOrder, error: createdError } = await frontendClient
              .from('bag_equipment')
              .select('*')
              .eq('bag_id', testBagId)
              .order('created_at');
              
            if (createdError) {
              console.log(`❌ ORDER BY created_at also fails: ${createdError.message}`);
            } else {
              console.log(`✅ ORDER BY created_at works: ${createdOrder?.length || 0} items`);
            }
          } else {
            console.log(`✅ ORDER BY added_at works: ${withOrder?.length || 0} items`);
          }
        } catch (e) {
          console.log(`❌ Order test exception: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`❌ No order by exception: ${e.message}`);
    }

    console.log('\n5. COLUMN STRUCTURE CHECK...\n');
    
    // Check what columns actually exist in bag_equipment
    try {
      const { data: sample, error } = await frontendClient
        .from('bag_equipment')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Cannot check columns: ${error.message}`);
      } else if (sample && sample.length > 0) {
        console.log('✅ bag_equipment columns:');
        Object.keys(sample[0]).forEach(col => {
          console.log(`   - ${col}: ${sample[0][col]}`);
        });
      } else {
        console.log('⚠️ No sample data to check columns');
      }
    } catch (e) {
      console.log(`❌ Column check exception: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR during frontend query test:', error);
  }
}

// Run the test
testFrontendQueries().then(() => {
  console.log('\n🔍 FRONTEND QUERY TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.error('💥 FRONTEND QUERY TEST CRASHED:', error);
  process.exit(1);
});