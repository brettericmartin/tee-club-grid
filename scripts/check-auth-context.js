#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🔐 CHECKING AUTH CONTEXT ISSUES');
console.log('===============================\n');

async function checkAuthContext() {
  try {
    // Create anon client like the frontend uses
    const { createClient } = await import('@supabase/supabase-js');
    const frontendClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    console.log('1. CHECKING PROFILE CONTEXT...\n');
    
    // The AuthContext in the frontend tries to access authContext.profile?.username
    // Let's see if profiles are properly set up for users
    
    const { data: profiles } = await frontendClient
      .from('profiles')
      .select('*');
      
    console.log(`Found ${profiles?.length || 0} profiles:`);
    profiles?.forEach(profile => {
      console.log(`  - ID: ${profile.id}`);
      console.log(`    Username: ${profile.username || 'NULL'}`);
      console.log(`    Display Name: ${profile.display_name || 'NULL'}`);
      console.log(`    Created: ${profile.created_at}`);
      console.log('');
    });

    console.log('2. CHECKING BAG OWNERSHIP...\n');
    
    // Check if bags have proper user_id references
    const { data: bags } = await frontendClient
      .from('user_bags')
      .select('*');
      
    console.log(`Found ${bags?.length || 0} bags:`);
    bags?.forEach(bag => {
      console.log(`  - "${bag.name}" (${bag.id})`);
      console.log(`    User ID: ${bag.user_id}`);
      console.log(`    Is Primary: ${bag.is_primary}`);
      console.log(`    Is Public: ${bag.is_public}`);
      console.log('');
    });

    console.log('3. TESTING SPECIFIC USER CONTEXT...\n');
    
    // Test what happens when we simulate a specific user being logged in
    const testUserId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // brettmartinplay
    
    console.log(`Testing as user: ${testUserId}`);
    
    // Check if this user has a profile
    const { data: userProfile } = await frontendClient
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
      
    if (userProfile) {
      console.log('✅ User profile exists:');
      console.log(`   Username: ${userProfile.username}`);
      console.log(`   Display Name: ${userProfile.display_name || 'None'}`);
    } else {
      console.log('❌ User profile not found');
    }

    // Check this user's bags
    const { data: userBags } = await frontendClient
      .from('user_bags')
      .select('*')
      .eq('user_id', testUserId);
      
    console.log(`User has ${userBags?.length || 0} bags:`);
    userBags?.forEach((bag, i) => {
      console.log(`   ${i + 1}. "${bag.name}" (Primary: ${bag.is_primary})`);
    });

    console.log('\n4. CHECKING ENVIRONMENT VARIABLES...\n');
    
    console.log('Environment check:');
    console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL?.substring(0, 30)}...`);
    console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30)}...`);
    
    // Test the exact connection the frontend uses
    console.log('\nTesting frontend connection...');
    try {
      const { data, error } = await frontendClient.from('profiles').select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Frontend connection failed: ${error.message}`);
      } else {
        console.log(`✅ Frontend connection works: ${data} profiles`);
      }
    } catch (e) {
      console.log(`❌ Frontend connection exception: ${e.message}`);
    }

    console.log('\n5. TESTING THE EXACT MYBAGSUPABASE FLOW...\n');
    
    // Simulate exactly what MyBagSupabase.tsx does on page load
    console.log('Simulating MyBagSupabase initialization...');
    
    // Step 1: loadBags()
    console.log('Step 1: Loading bags...');
    const { data: bags1, error: bagsError } = await frontendClient
      .from('user_bags')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true });

    if (bagsError) {
      console.log(`❌ loadBags failed: ${bagsError.message}`);
      return;
    }
    
    console.log(`✅ loadBags: ${bags1?.length || 0} bags`);
    
    if (!bags1 || bags1.length === 0) {
      console.log('⚠️ No bags found - would create default bag');
      return;
    }
    
    const primaryBag = bags1.find(bag => bag.is_primary) || bags1[0];
    console.log(`Primary bag: "${primaryBag.name}" (${primaryBag.id})`);
    
    // Step 2: loadBagEquipment()
    console.log('Step 2: Loading bag equipment...');
    const { data: equipment, error: equipError } = await frontendClient
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
      .eq('bag_id', primaryBag.id)
      .order('added_at');

    if (equipError) {
      console.log(`❌ loadBagEquipment failed: ${equipError.message}`);
      console.log(`   Code: ${equipError.code}`);
      console.log(`   Details: ${equipError.details}`);
      console.log('   🚨 THIS IS THE ISSUE!');
      return;
    }
    
    console.log(`✅ loadBagEquipment: ${equipment?.length || 0} items`);
    
    // Step 3: calculateTotalTees()
    console.log('Step 3: Calculating total tees...');
    
    // Count bag tees
    const bagIds = bags1.map(bag => bag.id);
    const { count: bagTees } = await frontendClient
      .from('bag_likes')
      .select('*', { count: 'exact', head: true })
      .in('bag_id', bagIds);
      
    console.log(`Bag tees: ${bagTees || 0}`);
    
    // Count post tees
    const { data: posts } = await frontendClient
      .from('feed_posts')
      .select('id')
      .eq('user_id', testUserId);
      
    let postTees = 0;
    if (posts && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const { count } = await frontendClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);
      postTees = count || 0;
    }
    
    console.log(`Post tees: ${postTees}`);
    console.log(`Total tees: ${(bagTees || 0) + postTees}`);
    
    console.log('\n✅ ALL STEPS COMPLETED SUCCESSFULLY!');
    console.log('The frontend queries work fine from this script.');
    console.log('The issue might be browser-specific or cached state.');

  } catch (error) {
    console.error('❌ CRITICAL ERROR during auth context check:', error);
  }
}

// Run the check
checkAuthContext().then(() => {
  console.log('\n🔐 AUTH CONTEXT CHECK COMPLETE');
  console.log('\nIf all queries work here but fail in browser:');
  console.log('1. Clear browser cache and localStorage');
  console.log('2. Check browser console for different error messages');
  console.log('3. Verify the browser is using the same environment variables');
  process.exit(0);
}).catch(error => {
  console.error('💥 AUTH CONTEXT CHECK CRASHED:', error);
  process.exit(1);
});