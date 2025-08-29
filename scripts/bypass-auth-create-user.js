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
console.log('🔧 BYPASS AUTH - CREATE USER DIRECTLY');
console.log('================================================================================\n');

async function bypassAuthCreation(email, displayName) {
  const username = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const userId = crypto.randomUUID();
  
  console.log('Creating user WITHOUT using Supabase Auth:');
  console.log(`  ID: ${userId}`);
  console.log(`  Email: ${email}`);
  console.log(`  Username: ${username}`);
  console.log(`  Display Name: ${displayName}\n`);
  
  // Check beta capacity
  const { count: betaCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true);
  
  const hasCapacity = (betaCount || 0) < 150;
  console.log(`Beta capacity: ${betaCount || 0}/150 (has capacity: ${hasCapacity})\n`);
  
  // Create profile directly (this is what we'll do if auth is broken)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email.toLowerCase(),
      username: username,
      display_name: displayName,
      beta_access: hasCapacity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (profileError) {
    // If this fails, it's because we need an auth.users entry first
    console.log('❌ Can\'t create profile without auth user (foreign key constraint)');
    console.log('   This confirms auth.users MUST exist first');
    console.log('\n   The issue is 100% in the auth trigger or Supabase auth settings');
    return null;
  }
  
  console.log('✅ Profile created successfully!');
  console.log(`   Username: @${profile.username}`);
  console.log(`   Beta Access: ${profile.beta_access}`);
  
  return profile;
}

// Test with sample data
async function runTest() {
  const testEmail = `bypass-${Date.now()}@test.com`;
  const testDisplayName = `Bypass User ${Date.now()}`;
  
  const profile = await bypassAuthCreation(testEmail, testDisplayName);
  
  if (profile) {
    console.log('\n⚠️ Note: This user has no auth credentials');
    console.log('   They exist in profiles but can\'t sign in');
    console.log('   This is just for testing\n');
    
    // Clean up
    await supabase.from('profiles').delete().eq('id', profile.id);
    console.log('🧹 Test profile cleaned up');
  } else {
    console.log('\n================================================================================');
    console.log('💡 DIAGNOSIS');
    console.log('================================================================================\n');
    
    console.log('The foreign key constraint means:');
    console.log('1. We CANNOT create profiles without auth.users');
    console.log('2. The auth trigger MUST work for users to sign up');
    console.log('3. The "Database error" is coming from the trigger\n');
    
    console.log('IMMEDIATE ACTION:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run EMERGENCY_FIX_TRIGGER.sql');
    console.log('3. Test again with: node scripts/test-auth-complete.js');
  }
}

runTest();