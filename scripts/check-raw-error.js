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
console.log('🔍 CHECKING RAW ERROR FROM AUTH SYSTEM');
console.log('================================================================================\n');

async function checkError() {
  // Try with MINIMAL data to see exact error
  const testEmail = `minimal-${Date.now()}@test.com`;
  
  console.log('Attempting to create user with username in metadata...');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
    user_metadata: {
      username: `testuser${Date.now()}`,
      display_name: 'Test User'
    }
  });
  
  if (error) {
    console.log('\n❌ Full error object:');
    console.log(JSON.stringify(error, null, 2));
    
    console.log('\n📋 Error breakdown:');
    console.log(`   Message: ${error.message}`);
    console.log(`   Status: ${error.status}`);
    console.log(`   Code: ${error.code}`);
    
    // Try to get more details from logs
    console.log('\n📋 Checking if it\'s a trigger error...');
    
    // The error "Database error creating new user" usually means the trigger failed
    // Let's try to create a profile directly to see if there are constraints
    console.log('\n📋 Testing direct profile insert...');
    
    const testId = crypto.randomUUID();
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: testEmail,
        username: `testuser${Date.now()}`,
        display_name: 'Test User'
      });
    
    if (profileError) {
      console.log('   Direct profile insert error:');
      console.log(`   ${profileError.message}`);
      console.log('   This might be what\'s blocking the trigger');
    } else {
      console.log('   ✅ Direct profile insert works');
      // Clean up
      await supabase.from('profiles').delete().eq('id', testId);
    }
    
  } else {
    console.log('✅ User created successfully!');
    console.log(`   User ID: ${data.user.id}`);
    
    // Clean up
    await supabase.auth.admin.deleteUser(data.user.id);
  }
}

checkError();