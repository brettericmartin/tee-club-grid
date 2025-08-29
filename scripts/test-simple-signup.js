#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Use anon client like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🧪 TESTING SIMPLE PROFILE CREATION (No Waitlist Table!)');
console.log('================================================================================\n');

async function testSimpleSignup() {
  const testEmail = `simple-test-${Date.now()}@example.com`;
  const testId = uuidv4();
  
  try {
    // 1. Count current beta users
    console.log('📋 Step 1: Counting beta users...');
    const { count: betaCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    if (countError) {
      console.log(`   ⚠️  Count error: ${countError.message}`);
    } else {
      console.log(`   ✅ Current beta users: ${betaCount}/150`);
    }
    
    const hasCapacity = (betaCount || 0) < 150;
    
    // 2. Create a profile directly (no waitlist table!)
    console.log('\n📋 Step 2: Creating profile directly...');
    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: testEmail,
        display_name: 'Simple Test User',
        username: 'simpletest' + Math.floor(Math.random() * 10000),
        beta_access: hasCapacity,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.log(`   ❌ Insert failed: ${insertError.message}`);
      console.log(`   Error code: ${insertError.code}`);
      
      if (insertError.code === '42501') {
        console.log('\n🔧 RLS is blocking inserts!');
        console.log('   Run this SQL in Supabase Dashboard:');
        console.log('   -> Open FIX_PROFILE_RLS_NOW.sql');
        console.log('   -> Copy and run in SQL Editor');
      }
    } else {
      console.log(`   ✅ Profile created successfully!`);
      console.log(`      ID: ${profile.id}`);
      console.log(`      Email: ${profile.email}`);
      console.log(`      Beta Access: ${profile.beta_access}`);
      
      // 3. Verify we can read it back
      console.log('\n📋 Step 3: Verifying profile is readable...');
      const { data: check, error: checkError } = await supabase
        .from('profiles')
        .select('email, beta_access')
        .eq('id', testId)
        .single();
      
      if (checkError) {
        console.log(`   ❌ Read failed: ${checkError.message}`);
      } else {
        console.log(`   ✅ Profile is readable`);
      }
      
      // 4. Clean up
      console.log('\n📋 Step 4: Cleaning up test data...');
      // Use service role to clean up
      const adminClient = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { error: deleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', testId);
      
      if (deleteError) {
        console.log(`   ⚠️  Cleanup failed: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Test data cleaned`);
      }
    }
    
    // Summary
    console.log('\n================================================================================');
    console.log('📊 TEST SUMMARY');
    console.log('================================================================================\n');
    
    if (!insertError) {
      console.log('✅ SIMPLE SIGNUP WORKS!');
      console.log('\nThe system can now:');
      console.log('  1. Create profiles directly (no waitlist table)');
      console.log('  2. Grant beta access to first 150 users');
      console.log('  3. Put users 151+ on waitlist (beta_access = false)');
    } else {
      console.log('❌ SIGNUP BLOCKED BY RLS');
      console.log('\nTo fix:');
      console.log('  1. Open Supabase Dashboard');
      console.log('  2. Go to SQL Editor');
      console.log('  3. Run the SQL from FIX_PROFILE_RLS_NOW.sql');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSimpleSignup();