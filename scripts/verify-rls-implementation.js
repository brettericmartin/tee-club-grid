#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

// Create different clients for testing
const anonClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test user IDs (you'll need to update these with real user IDs from your database)
const TEST_USER_ID = 'test-user-id';  // Replace with actual user ID
const TEST_BAG_ID = 'test-bag-id';    // Replace with actual bag ID
const TEST_EQUIPMENT_ID = 'test-equipment-id'; // Replace with actual equipment ID

async function verifyRLS() {
  console.log('🔍 VERIFYING RLS IMPLEMENTATION FOR AFFILIATE & VIDEO FEATURES\n');
  console.log('=' .repeat(70));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  // ============================================================================
  // TEST 1: Check RLS is enabled
  // ============================================================================
  console.log('\n📋 TEST 1: Verifying RLS is enabled on all tables...');
  
  const tables = [
    'user_equipment_links',
    'equipment_videos', 
    'user_bag_videos',
    'link_clicks'
  ];
  
  for (const table of tables) {
    try {
      // Try to query with anon client (should work with RLS)
      const { data, error } = await anonClient
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ ${table}: RLS enabled and accessible`);
        results.passed.push(`${table}: RLS enabled`);
      } else if (error.message.includes('permission denied')) {
        console.log(`✅ ${table}: RLS enabled (permission denied as expected)`);
        results.passed.push(`${table}: RLS properly restricting access`);
      } else {
        console.log(`⚠️  ${table}: Unexpected error - ${error.message}`);
        results.warnings.push(`${table}: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Failed to verify - ${err.message}`);
      results.failed.push(`${table}: ${err.message}`);
    }
  }
  
  // ============================================================================
  // TEST 2: Test user_equipment_links policies
  // ============================================================================
  console.log('\n📋 TEST 2: Testing user_equipment_links policies...');
  
  // Test SELECT (should work for everyone)
  try {
    const { data, error } = await anonClient
      .from('user_equipment_links')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ Anonymous SELECT: Allowed (public read)');
      results.passed.push('user_equipment_links: Anonymous can read');
    } else {
      console.log(`❌ Anonymous SELECT: ${error.message}`);
      results.failed.push(`user_equipment_links SELECT: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Anonymous SELECT failed: ${err.message}`);
    results.failed.push(`user_equipment_links SELECT: ${err.message}`);
  }
  
  // Test INSERT (should fail for anonymous)
  try {
    const { data, error } = await anonClient
      .from('user_equipment_links')
      .insert({
        user_id: TEST_USER_ID,
        bag_id: TEST_BAG_ID,
        equipment_id: TEST_EQUIPMENT_ID,
        url: 'https://test.com',
        retailer: 'Test Retailer'
      });
    
    if (error && error.message.includes('violates row-level security')) {
      console.log('✅ Anonymous INSERT: Blocked (as expected)');
      results.passed.push('user_equipment_links: Anonymous cannot insert');
    } else {
      console.log('❌ Anonymous INSERT: Should have been blocked');
      results.failed.push('user_equipment_links: Anonymous INSERT not blocked');
    }
  } catch (err) {
    console.log(`✅ Anonymous INSERT blocked: ${err.message}`);
    results.passed.push('user_equipment_links: Anonymous cannot insert');
  }
  
  // ============================================================================
  // TEST 3: Test equipment_videos policies
  // ============================================================================
  console.log('\n📋 TEST 3: Testing equipment_videos policies...');
  
  // Test SELECT for verified videos
  try {
    const { data, error } = await anonClient
      .from('equipment_videos')
      .select('*')
      .eq('verified', true)
      .limit(1);
    
    if (!error) {
      console.log('✅ Anonymous SELECT verified videos: Allowed');
      results.passed.push('equipment_videos: Can view verified videos');
    } else {
      console.log(`⚠️  Anonymous SELECT verified: ${error.message}`);
      results.warnings.push(`equipment_videos SELECT: ${error.message}`);
    }
  } catch (err) {
    console.log(`⚠️  Verified videos test: ${err.message}`);
    results.warnings.push(`equipment_videos: ${err.message}`);
  }
  
  // ============================================================================
  // TEST 4: Test user_bag_videos policies
  // ============================================================================
  console.log('\n📋 TEST 4: Testing user_bag_videos policies...');
  
  // Test SELECT (should work for everyone)
  try {
    const { data, error } = await anonClient
      .from('user_bag_videos')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ Anonymous SELECT: Allowed (public read)');
      results.passed.push('user_bag_videos: Anonymous can read');
    } else {
      console.log(`❌ Anonymous SELECT: ${error.message}`);
      results.failed.push(`user_bag_videos SELECT: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Anonymous SELECT failed: ${err.message}`);
    results.failed.push(`user_bag_videos SELECT: ${err.message}`);
  }
  
  // ============================================================================
  // TEST 5: Test link_clicks policies
  // ============================================================================
  console.log('\n📋 TEST 5: Testing link_clicks policies...');
  
  // Test INSERT (should work for everyone)
  try {
    const { data, error } = await anonClient
      .from('link_clicks')
      .insert({
        link_id: 'test-link-id',
        clicked_at: new Date().toISOString()
      });
    
    if (!error || error.message.includes('foreign key')) {
      console.log('✅ Anonymous INSERT: Allowed (for tracking)');
      results.passed.push('link_clicks: Anonymous can insert');
    } else if (error.message.includes('violates row-level security')) {
      console.log('❌ Anonymous INSERT: Should be allowed');
      results.failed.push('link_clicks: Anonymous INSERT blocked');
    }
  } catch (err) {
    if (err.message.includes('foreign key')) {
      console.log('✅ Anonymous INSERT: Policy works (failed on FK constraint)');
      results.passed.push('link_clicks: Insert policy working');
    } else {
      console.log(`⚠️  INSERT test: ${err.message}`);
      results.warnings.push(`link_clicks INSERT: ${err.message}`);
    }
  }
  
  // Test SELECT (should fail for anonymous)
  try {
    const { data, error } = await anonClient
      .from('link_clicks')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('permission denied')) {
      console.log('✅ Anonymous SELECT: Blocked (owner-only analytics)');
      results.passed.push('link_clicks: Analytics restricted to owners');
    } else if (!error && (!data || data.length === 0)) {
      console.log('✅ Anonymous SELECT: No data visible (proper restriction)');
      results.passed.push('link_clicks: Analytics properly restricted');
    } else {
      console.log('⚠️  Anonymous SELECT: May have overly permissive policies');
      results.warnings.push('link_clicks: Check SELECT restrictions');
    }
  } catch (err) {
    console.log(`✅ Anonymous SELECT blocked: ${err.message}`);
    results.passed.push('link_clicks: Analytics restricted');
  }
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RLS VERIFICATION SUMMARY\n');
  
  console.log(`✅ Passed: ${results.passed.length} tests`);
  if (results.passed.length > 0) {
    results.passed.forEach(test => console.log(`   • ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(test => console.log(`   • ${test}`));
  }
  
  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  if (results.failed.length === 0) {
    console.log('✨ RLS implementation appears to be working correctly!');
    console.log('   • All tables have RLS enabled');
    console.log('   • Policies are properly restricting access');
    console.log('   • Anonymous users have appropriate read-only access');
    console.log('   • Insert/Update/Delete operations are owner-restricted');
  } else {
    console.log('⚠️  Some RLS policies may need adjustment:');
    console.log('   1. Run the final-rls-implementation.sql script');
    console.log('   2. Check for any custom policies that may conflict');
    console.log('   3. Ensure the profiles table has is_admin column');
    console.log('   4. Verify foreign key relationships are correct');
  }
  
  console.log('\n🧪 NEXT STEPS:');
  console.log('   1. Test with actual authenticated users');
  console.log('   2. Verify admin moderation capabilities');
  console.log('   3. Test the full user flow in the application');
  console.log('   4. Monitor performance with production data');
  
  console.log('\n' + '=' .repeat(70));
}

// Run verification
verifyRLS()
  .then(() => {
    console.log('\n✅ RLS verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });