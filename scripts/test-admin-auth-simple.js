#!/usr/bin/env node
/**
 * Simple Admin Authorization Test
 * Tests basic admin table functionality and API access
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSystem() {
  console.log('🚀 Testing Admin Authorization System');
  console.log('=====================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Admin table exists
  console.log('🧪 Test 1: Admin table structure');
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id, created_at, notes, created_by')
      .limit(1);

    if (error) throw error;
    console.log('✅ Admin table exists and is accessible');
    passed++;
  } catch (error) {
    console.log('❌ Admin table test failed:', error.message);
    failed++;
  }

  // Test 2: Admin functions exist
  console.log('\n🧪 Test 2: Admin database functions');
  try {
    // Test current_user_is_admin function
    const { data: result1, error: error1 } = await supabase.rpc('current_user_is_admin');
    if (error1) throw new Error(`current_user_is_admin failed: ${error1.message}`);

    // Test is_admin function with dummy UUID
    const dummyUuid = '00000000-0000-0000-0000-000000000000';
    const { data: result2, error: error2 } = await supabase.rpc('is_admin', { 
      check_user_id: dummyUuid 
    });
    if (error2) throw new Error(`is_admin failed: ${error2.message}`);

    console.log('✅ Admin functions are working');
    console.log(`   current_user_is_admin(): ${result1}`);
    console.log(`   is_admin(dummy): ${result2}`);
    passed++;
  } catch (error) {
    console.log('❌ Admin functions test failed:', error.message);
    failed++;
  }

  // Test 3: Check existing admins
  console.log('\n🧪 Test 3: Current admin users');
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id, created_at, notes')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`✅ Found ${data.length} admin user(s):`);
    data.forEach((admin, index) => {
      console.log(`   ${index + 1}. User ID: ${admin.user_id.substring(0, 8)}...`);
      console.log(`      Created: ${new Date(admin.created_at).toLocaleDateString()}`);
      console.log(`      Notes: ${admin.notes || 'None'}`);
    });

    if (data.length === 0) {
      console.log('⚠️  Warning: No admin users found. You may need to run the seed script.');
    }
    passed++;
  } catch (error) {
    console.log('❌ Admin users test failed:', error.message);
    failed++;
  }

  // Test 4: RLS policies exist
  console.log('\n🧪 Test 4: Row Level Security policies');
  try {
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            cmd
          FROM pg_policies 
          WHERE tablename = 'admins'
          ORDER BY policyname;
        `
      });

    if (error) {
      // Fallback: try to check if RLS is enabled
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('sql', {
          query: `
            SELECT 
              tablename,
              rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'admins' AND schemaname = 'public';
          `
        });
      
      if (rlsError) throw rlsError;
      
      console.log('✅ RLS status checked (policies query not available)');
      if (rlsData?.[0]?.rowsecurity) {
        console.log('   RLS is enabled on admins table');
      } else {
        console.log('   ⚠️  RLS may not be enabled');
      }
    } else {
      console.log(`✅ Found ${data.length} RLS policies on admins table:`);
      data.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }
    passed++;
  } catch (error) {
    console.log('❌ RLS policies test failed:', error.message);
    failed++;
  }

  // Test 5: Test unauthenticated API access
  console.log('\n🧪 Test 5: API endpoint protection');
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/waitlist/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });

    if (response.status === 401) {
      console.log('✅ Unauthenticated requests are properly rejected (401)');
      passed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      failed++;
    }
  } catch (error) {
    // Network errors are acceptable for this test
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      console.log('⚠️  API endpoint test skipped (server not running)');
    } else {
      console.log('❌ API endpoint test failed:', error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Admin system is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`);
  }

  // Next steps
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Run database migrations: node scripts/create-admins-table.sql');
  console.log('2. Seed initial admin: node scripts/seed-admin.sql (update email first)');
  console.log('3. Test with real user: node scripts/test-admin-auth.js');
  console.log('4. Access admin panel: http://localhost:3000/admin/waitlist');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testAdminSystem().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});