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
console.log('🔍 CHECKING IF TRIGGER EXISTS AND WHAT\'S IN IT');
console.log('================================================================================\n');

async function checkTrigger() {
  // Query to check if trigger exists
  const { data: triggers, error: triggerError } = await supabase
    .rpc('get_triggers')
    .single();
  
  if (triggerError) {
    // Try a simpler approach
    console.log('Checking triggers (alternate method)...\n');
    
    // Let's see what happens when we create a user with ALL required fields
    const testEmail = `complete-${Date.now()}@test.com`;
    const username = `user${Date.now()}`;
    
    console.log('Creating user with complete metadata:');
    console.log(`  email: ${testEmail}`);
    console.log(`  username: ${username}`);
    console.log(`  display_name: Test User`);
    console.log(`  beta_access: true`);
    console.log(`  city_region: Test City\n`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: {
        username: username,
        display_name: 'Test User',
        beta_access: true,
        city_region: 'Test City',
        email: testEmail  // Try including email in metadata too
      }
    });
    
    if (error) {
      console.log(`❌ Still failing: ${error.message}`);
      console.log('\nThis means either:');
      console.log('1. The trigger doesn\'t exist');
      console.log('2. The trigger is throwing an error');
      console.log('3. There\'s a database-level constraint issue');
      
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run this query to check the trigger:');
      console.log('\nSELECT proname, prosrc FROM pg_proc WHERE proname = \'handle_new_user\';');
      console.log('\n3. If no results, the trigger function is missing');
      console.log('4. If it exists, check the source code (prosrc column)');
      
    } else {
      console.log('✅ SUCCESS! User created!');
      console.log(`   User ID: ${data.user.id}`);
      
      // Check the profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profile) {
        console.log('\n✅ Profile created by trigger:');
        console.log(`   username: ${profile.username}`);
        console.log(`   display_name: ${profile.display_name}`);
        console.log(`   beta_access: ${profile.beta_access}`);
        console.log(`   city_region: ${profile.city_region}`);
      }
      
      // Clean up
      await supabase.auth.admin.deleteUser(data.user.id);
      console.log('\n🧹 Test user cleaned up');
    }
  } else {
    console.log('Triggers found:', triggers);
  }
}

checkTrigger();