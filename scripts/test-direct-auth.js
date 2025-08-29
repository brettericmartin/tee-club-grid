#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('================================================================================');
console.log('🔍 TESTING DIRECT AUTH USER CREATION');
console.log('================================================================================\n');

async function testDirectAuth() {
  const testEmail = `direct-${Date.now()}@test.com`;
  const testUsername = `user${Date.now()}`;
  
  console.log('📋 Test 1: Create user with admin API (bypasses triggers)');
  try {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: {
        username: testUsername,
        display_name: 'Test User',
        beta_access: true
      }
    });
    
    if (error) {
      console.log(`   ❌ Admin API failed: ${error.message}`);
      console.log('   Error details:', error);
      
      // This confirms the issue is at the Supabase/database level
      console.log('\n🚨 CRITICAL: Supabase cannot create users at all!');
      console.log('   This is likely due to:');
      console.log('   1. Database connection issues');
      console.log('   2. Auth schema corruption');
      console.log('   3. Trigger throwing an error');
      
    } else {
      console.log(`   ✅ User created: ${user.user.email}`);
      console.log(`   User ID: ${user.user.id}`);
      
      // Check if profile was created
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();
      
      if (profile) {
        console.log('   ✅ Profile created:');
        console.log(`      Username: ${profile.username}`);
        console.log(`      Beta access: ${profile.beta_access}`);
      } else {
        console.log('   ❌ No profile created - trigger failed');
      }
      
      // Clean up
      await supabase.auth.admin.deleteUser(user.user.id);
      console.log('   🧹 Test user cleaned up');
    }
  } catch (e) {
    console.log(`   ❌ Unexpected error: ${e.message}`);
  }
  
  console.log('\n📋 Test 2: Check if trigger exists');
  const { data: triggers, error: triggerError } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .eq('tgname', 'on_auth_user_created')
    .single();
  
  if (triggers) {
    console.log('   ✅ Trigger exists: on_auth_user_created');
  } else {
    console.log('   ❌ Trigger missing or inaccessible');
  }
  
  console.log('\n================================================================================');
  console.log('💡 NEXT STEPS');
  console.log('================================================================================\n');
  
  console.log('Check Supabase Dashboard:');
  console.log('1. Go to Database > Functions');
  console.log('2. Find handle_new_user function');
  console.log('3. Check if it has errors');
  console.log('\nOR');
  console.log('\n1. Go to Logs > Postgres Logs');
  console.log('2. Look for errors when creating users');
}

testDirectAuth();