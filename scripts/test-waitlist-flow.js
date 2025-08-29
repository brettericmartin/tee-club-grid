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

// Use anon key to simulate frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🧪 TESTING WAITLIST SUBMISSION (AS FRONTEND WOULD)');
console.log('================================================================================\n');

async function testWaitlistFlow() {
  const testDisplayName = `Test User ${Date.now()}`;
  const testEmail = `test-${Date.now()}@example.com`;
  const username = testDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  console.log('📋 Simulating frontend waitlist submission');
  console.log(`   Display Name: ${testDisplayName}`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Generated Username: ${username}`);
  
  try {
    // Step 1: Check if username exists (as service does)
    console.log('\n📋 Step 1: Check username availability');
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    if (existingUsername) {
      console.log(`   ❌ Username already taken: ${username}`);
      return;
    }
    console.log('   ✅ Username is available');
    
    // Step 2: Check email
    console.log('\n📋 Step 2: Check email availability');
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', testEmail.toLowerCase())
      .single();
    
    if (existingEmail) {
      console.log(`   ❌ Email already registered: ${testEmail}`);
      return;
    }
    console.log('   ✅ Email is available');
    
    // Step 3: Check beta capacity
    console.log('\n📋 Step 3: Check beta capacity');
    const { count: betaCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const hasCapacity = (betaCount || 0) < 150;
    console.log(`   Current beta users: ${betaCount || 0}/150`);
    console.log(`   Has capacity: ${hasCapacity}`);
    
    // Step 4: Create user (as service does)
    console.log('\n📋 Step 4: Create auth user');
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail.toLowerCase(),
      password: tempPassword,
      options: {
        data: {
          username: username,  // REQUIRED by trigger
          display_name: testDisplayName,
          beta_access: hasCapacity,
        }
      }
    });
    
    if (signUpError) {
      console.log(`   ❌ Signup failed: ${signUpError.message}`);
      
      if (signUpError.message?.includes('Database error')) {
        console.log('\n🚨 CRITICAL: The trigger is still failing!');
        console.log('   Make sure you ran SIMPLE_TRIGGER.sql in Supabase');
        console.log('   The trigger MUST accept username from metadata');
      }
      return;
    }
    
    console.log(`   ✅ Auth user created: ${authData.user.id}`);
    console.log(`   📧 Confirmation email sent to: ${testEmail}`);
    
    // Step 5: Verify profile was created
    console.log('\n📋 Step 5: Verify profile creation');
    
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile) {
      console.log(`   ❌ Profile not created: ${profileError?.message}`);
      console.log('   🚨 Trigger did not create profile!');
      return;
    }
    
    console.log('   ✅ Profile created successfully!');
    console.log(`      Username: @${profile.username}`);
    console.log(`      Display Name: ${profile.display_name}`);
    console.log(`      Beta Access: ${profile.beta_access}`);
    
    // Step 6: Show result message (as frontend would)
    console.log('\n================================================================================');
    console.log('📱 FRONTEND WOULD SHOW:');
    console.log('================================================================================\n');
    
    if (hasCapacity) {
      console.log(`🎉 Welcome @${username}!`);
      console.log(`You're beta user #${(betaCount || 0) + 1}.`);
      console.log('Check your email to set your password.');
    } else {
      const position = ((betaCount || 150) - 150) + 1;
      console.log(`You're #${position} on the waitlist @${username}.`);
      console.log('Check your email to set your password.');
    }
    
    console.log('\n✅ WAITLIST FLOW WORKING!');
    
    // Note: Can't delete user with anon key, would need service key
    console.log('\n⚠️ Note: Test user created but not deleted (needs service key)');
    console.log(`   User ID: ${authData.user.id}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testWaitlistFlow();