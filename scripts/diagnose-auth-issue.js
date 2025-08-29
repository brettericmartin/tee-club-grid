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
console.log('🔍 DIAGNOSING AUTH ISSUE');
console.log('================================================================================\n');

async function diagnose() {
  // 1. Check if we can query auth.users at all
  console.log('📋 Test 1: Can we access auth.users table?');
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.log(`   ❌ Cannot access auth.users: ${error.message}`);
    } else {
      console.log(`   ✅ Can access auth.users (found ${users.users.length} users)`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  // 2. Check profiles table structure
  console.log('\n📋 Test 2: Check profiles table');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profileError) {
    console.log(`   ❌ Cannot query profiles: ${profileError.message}`);
  } else {
    console.log(`   ✅ Profiles table accessible`);
    if (profiles.length > 0) {
      console.log('   Sample profile columns:', Object.keys(profiles[0]));
    }
  }
  
  // 3. Try to create a test user with service role
  console.log('\n📋 Test 3: Try creating user with service role');
  const testEmail = `service-test-${Date.now()}@example.com`;
  
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
    user_metadata: {
      display_name: 'Service Test'
    }
  });
  
  if (createError) {
    console.log(`   ❌ Cannot create user: ${createError.message}`);
    console.log(`   Error details:`, createError);
  } else {
    console.log(`   ✅ User created successfully!`);
    console.log(`   User ID: ${newUser.user.id}`);
    
    // Check if profile was created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();
    
    if (profile) {
      console.log(`   ✅ Profile auto-created via trigger`);
    } else {
      console.log(`   ⚠️  No profile created - trigger may be missing`);
    }
    
    // Clean up
    await supabase.auth.admin.deleteUser(newUser.user.id);
    console.log(`   🧹 Test user cleaned up`);
  }
  
  // 4. Check if there's an issue with email domain or settings
  console.log('\n📋 Test 4: Check auth settings');
  
  console.log('\n================================================================================');
  console.log('💡 DIAGNOSIS COMPLETE');
  console.log('================================================================================\n');
  
  console.log('If user creation failed above, the issue is likely:');
  console.log('1. Auth email settings in Supabase Dashboard');
  console.log('2. Database connection issues');
  console.log('3. Missing permissions on auth schema');
  console.log('\nCheck Supabase Dashboard > Authentication > Settings');
}

diagnose();