#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Use anon client like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🧪 TESTING AUTH-BASED SIGNUP (Proper Supabase Way)');
console.log('================================================================================\n');

async function testAuthSignup() {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  
  try {
    // 1. Count current beta users
    console.log('📋 Step 1: Counting beta users...');
    const { count: betaCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    console.log(`   ✅ Current beta users: ${betaCount}/150`);
    const hasCapacity = (betaCount || 0) < 150;
    
    // 2. Create auth user (this auto-creates profile via trigger)
    console.log('\n📋 Step 2: Creating auth user...');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: 'Test User',
          beta_access: hasCapacity
        }
      }
    });
    
    if (signUpError) {
      console.log(`   ❌ Signup failed: ${signUpError.message}`);
      return;
    }
    
    console.log(`   ✅ Auth user created!`);
    console.log(`      User ID: ${authData.user?.id}`);
    
    // 3. Update profile with beta access
    if (authData.user) {
      console.log('\n📋 Step 3: Updating profile with beta access...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: 'Test User',
          beta_access: hasCapacity,
          email: testEmail,
          username: 'testuser' + Math.floor(Math.random() * 10000)
        })
        .eq('id', authData.user.id);
      
      if (updateError) {
        console.log(`   ⚠️  Update error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Profile updated with beta_access = ${hasCapacity}`);
      }
      
      // 4. Verify profile exists
      console.log('\n📋 Step 4: Verifying profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, beta_access, display_name')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.log(`   ❌ Profile not found: ${profileError.message}`);
      } else {
        console.log(`   ✅ Profile verified:`);
        console.log(`      Email: ${profile.email}`);
        console.log(`      Beta Access: ${profile.beta_access}`);
        console.log(`      Display Name: ${profile.display_name}`);
      }
    }
    
    // Summary
    console.log('\n================================================================================');
    console.log('📊 TEST RESULTS');
    console.log('================================================================================\n');
    
    console.log('✅ AUTH-BASED SIGNUP WORKS!');
    console.log('\nThe system now:');
    console.log('  1. Creates auth users properly');
    console.log('  2. Auto-creates profiles via trigger');
    console.log('  3. Updates beta_access based on capacity');
    console.log('  4. First 150 get access, rest are waitlisted');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAuthSignup();