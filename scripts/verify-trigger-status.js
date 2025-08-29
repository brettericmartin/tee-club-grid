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
console.log('🔍 VERIFY TRIGGER STATUS');
console.log('================================================================================\n');

async function verifyTrigger() {
  // Check current trigger function
  const { data: funcData, error: funcError } = await supabase.rpc('get_function_definition', {
    function_name: 'handle_new_user'
  }).single();
  
  if (funcError) {
    // Try alternate approach
    console.log('📋 Checking trigger function (alternate method)...\n');
    
    // Create a test user to see what happens
    const testEmail = `verify-${Date.now()}@test.com`;
    
    console.log('Testing with user that has username in metadata:');
    const { data: withUsername, error: withError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: {
        username: `user${Date.now()}`,
        display_name: 'Test User',
        beta_access: true
      }
    });
    
    if (withError) {
      console.log(`❌ Can't create user WITH username: ${withError.message}`);
    } else {
      console.log(`✅ Created user WITH username: ${withUsername.user.id}`);
      
      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', withUsername.user.id)
        .single();
      
      if (profile) {
        console.log(`   Profile username: ${profile.username}`);
        console.log(`   Profile display_name: ${profile.display_name}`);
      } else {
        console.log('   ❌ No profile created');
      }
      
      // Cleanup
      await supabase.auth.admin.deleteUser(withUsername.user.id);
    }
    
    console.log('\nTesting WITHOUT username in metadata:');
    const testEmail2 = `verify2-${Date.now()}@test.com`;
    const { data: withoutUsername, error: withoutError } = await supabase.auth.admin.createUser({
      email: testEmail2,
      email_confirm: true,
      user_metadata: {
        display_name: 'Test User 2',
        beta_access: true
        // NO username field
      }
    });
    
    if (withoutError) {
      console.log(`❌ Should have failed without username: ${withoutError.message}`);
    } else {
      console.log(`✅ Created user WITHOUT username: ${withoutUsername.user.id}`);
      
      // Check profile
      const { data: profile2 } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', withoutUsername.user.id)
        .single();
      
      if (profile2) {
        console.log(`   Profile username: ${profile2.username || 'NULL'}`);
        console.log(`   ⚠️ Trigger has fallback logic - should fail instead`);
      } else {
        console.log('   ❌ No profile created (good, username is required)');
      }
      
      // Cleanup
      await supabase.auth.admin.deleteUser(withoutUsername.user.id);
    }
    
  } else {
    console.log('Current trigger function definition:');
    console.log(funcData);
  }
  
  console.log('\n================================================================================');
  console.log('💡 TRIGGER STATUS SUMMARY');
  console.log('================================================================================\n');
  
  console.log('If users can be created WITH username but fail WITHOUT username:');
  console.log('✅ The SIMPLE_TRIGGER.sql has been applied correctly\n');
  
  console.log('If users can be created WITHOUT username:');
  console.log('❌ The trigger still has fallback logic\n');
  
  console.log('If BOTH fail with "Database error":');
  console.log('❌ There is a deeper issue with the trigger or constraints\n');
  
  console.log('Next steps:');
  console.log('1. Run SIMPLE_TRIGGER.sql in Supabase SQL Editor');
  console.log('2. Run: node scripts/test-auth-complete.js');
  console.log('3. Run: node scripts/test-waitlist-flow.js');
}

verifyTrigger();