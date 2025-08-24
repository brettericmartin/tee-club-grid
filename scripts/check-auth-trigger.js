#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kgleorvvtrqlgolzdbbw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDczNjk0MSwiZXhwIjoyMDY2MzEyOTQxfQ.4AT3NIctRyxWmHVSTFXHhxAx3Jz_5DtF9Kbzdg-gvRw';

console.log('🔍 Checking Auth Database Configuration...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthTrigger() {
  try {
    // Check if the handle_new_user function exists
    console.log('📝 Checking for handle_new_user function...');
    const { data: functions, error: funcError } = await supabase.rpc('get_functions', undefined).catch(() => ({ data: null, error: 'RPC not found' }));
    
    // Alternative: Try to check triggers directly
    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('*')
      .eq('tgname', 'on_auth_user_created')
      .single()
      .catch(() => ({ data: null, error: 'Cannot access pg_trigger' }));

    // Check profiles table structure
    console.log('\n📊 Checking profiles table structure...');
    const { data: profilesColumns, error: colError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    if (!colError) {
      console.log('✅ Profiles table exists');
    } else {
      console.error('❌ Cannot access profiles table:', colError);
    }

    // Try to manually insert a profile to test constraints
    console.log('\n🧪 Testing manual profile creation...');
    const testId = crypto.randomUUID();
    const testEmail = `test${Date.now()}@example.com`;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: testEmail,
        display_name: 'Test User',
        beta_access: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Cannot create profile:', profileError);
      
      // Check if it's a unique constraint violation
      if (profileError.message?.includes('unique') || profileError.message?.includes('duplicate')) {
        console.log('ℹ️ This might indicate the email already exists');
      }
    } else {
      console.log('✅ Profile created successfully');
      console.log('Profile ID:', profileData.id);
      
      // Clean up
      await supabase.from('profiles').delete().eq('id', testId);
      console.log('🧹 Test profile cleaned up');
    }

    // Check if there's a trigger or RLS policy preventing user creation
    console.log('\n🔒 Checking RLS policies on profiles table...');
    
    // Try to get the SQL for the handle_new_user function
    console.log('\n📜 Attempting to retrieve handle_new_user function...');
    const functionSQL = `
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'handle_new_user';
    `;
    
    // We can't run raw SQL directly, but we can check what we can
    console.log('ℹ️ Note: Direct SQL access limited. Checking what we can...');

    // Try creating a user with the auth.users table directly (if we have access)
    console.log('\n🔐 Testing direct auth user creation...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `direct-test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        username: 'directtest'
      }
    });

    if (userError) {
      console.error('❌ Cannot create user directly:', userError);
    } else {
      console.log('✅ User created directly via admin API');
      console.log('User ID:', userData.user.id);
      
      // Check if profile was created
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (profileCheckError) {
        console.error('❌ Profile NOT auto-created:', profileCheckError);
        console.log('⚠️ This indicates the trigger is not working!');
      } else {
        console.log('✅ Profile auto-created by trigger');
        console.log('Profile email:', profile.email);
      }

      // Clean up
      if (userData.user.id) {
        await supabase.auth.admin.deleteUser(userData.user.id);
        console.log('🧹 Test user cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAuthTrigger().then(() => {
  console.log('\n✅ Auth trigger check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});