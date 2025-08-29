#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Admin client for creating users
const adminClient = createClient(supabaseUrl, supabaseServiceKey);
// Anon client for testing sign in
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🚀 TESTING INSTANT ACCESS (NO EMAIL CONFIRMATION)');
console.log('================================================================================\n');

async function testInstantAccess() {
  const testEmail = `instant-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  const testUsername = `user${Date.now()}`;
  const testDisplayName = `Test User ${Date.now()}`;
  
  console.log('📋 Step 1: Create user with password (simulating form submission)');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
  console.log(`   Username: ${testUsername}`);
  
  // Method 1: Try with regular signUp (what the form does)
  console.log('\n🔹 Method 1: Regular signUp (requires email confirmation OFF in Dashboard)');
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        username: testUsername,
        display_name: testDisplayName,
        beta_access: true
      }
    }
  });
  
  if (signUpError) {
    console.log(`   ❌ SignUp failed: ${signUpError.message}`);
  } else {
    console.log(`   ✅ User created: ${signUpData.user.id}`);
    console.log(`   Email confirmed: ${signUpData.user.email_confirmed_at ? 'YES' : 'NO'}`);
    
    // Try to sign in immediately
    console.log('\n📋 Step 2: Try to sign in immediately');
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log(`   ❌ Can't sign in: ${signInError.message}`);
      console.log('   📧 Email confirmation is probably required');
      
      console.log('\n🔹 Method 2: Using admin API to auto-confirm');
      // Clean up first attempt
      if (signUpData.user) {
        await adminClient.auth.admin.deleteUser(signUpData.user.id);
      }
      
      // Try with admin API
      const testEmail2 = `instant2-${Date.now()}@test.com`;
      const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
        email: testEmail2,
        password: testPassword,
        email_confirm: true,  // Auto-confirm email
        user_metadata: {
          username: testUsername,
          display_name: testDisplayName,
          beta_access: true
        }
      });
      
      if (adminError) {
        console.log(`   ❌ Admin create failed: ${adminError.message}`);
      } else {
        console.log(`   ✅ User created with admin API: ${adminUser.user.id}`);
        console.log(`   Email auto-confirmed: YES`);
        
        // Try to sign in
        const { data: signIn2, error: signInError2 } = await anonClient.auth.signInWithPassword({
          email: testEmail2,
          password: testPassword
        });
        
        if (signInError2) {
          console.log(`   ❌ Still can't sign in: ${signInError2.message}`);
        } else {
          console.log(`   ✅ Sign in successful!`);
          console.log(`   User can access the platform immediately`);
        }
        
        // Clean up
        await adminClient.auth.admin.deleteUser(adminUser.user.id);
      }
      
    } else {
      console.log(`   ✅ Sign in successful!`);
      console.log(`   User ID: ${signInData.user.id}`);
      console.log(`   🎉 Instant access is working!`);
      
      // Clean up
      if (signUpData.user) {
        await adminClient.auth.admin.deleteUser(signUpData.user.id);
      }
    }
  }
  
  console.log('\n================================================================================');
  console.log('💡 RECOMMENDATIONS');
  console.log('================================================================================\n');
  
  console.log('For instant access (no email confirmation):');
  console.log('1. Go to Supabase Dashboard > Authentication > Providers > Email');
  console.log('2. Turn OFF "Confirm email"');
  console.log('3. Save changes\n');
  
  console.log('OR if you want to keep email confirmation for security:');
  console.log('1. Use the admin API with service role key');
  console.log('2. Set email_confirm: true when creating users');
  console.log('3. This requires backend API endpoint\n');
  
  console.log('Current approach in waitlistService.ts will work if:');
  console.log('✅ Email confirmation is disabled in Dashboard');
  console.log('✅ Users can set password and sign in immediately');
}

testInstantAccess();