#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kgleorvvtrqlgolzdbbw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDczNjk0MSwiZXhwIjoyMDY2MzEyOTQxfQ.4AT3NIctRyxWmHVSTFXHhxAx3Jz_5DtF9Kbzdg-gvRw';

console.log('🔧 Applying Auth Trigger Fix...\n');
console.log('⚠️  IMPORTANT: You need to run the SQL script in Supabase dashboard:\n');
console.log('1. Go to: https://supabase.com/dashboard/project/kgleorvvtrqlgolzdbbw/sql');
console.log('2. Copy and paste the contents of scripts/fix-auth-trigger.sql');
console.log('3. Click "Run" to execute the SQL\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSignupAfterFix() {
  try {
    // Wait for user confirmation
    console.log('After running the SQL, we\'ll test if signup works.\n');
    
    // Test creating a user via admin API first
    console.log('📝 Testing admin user creation...');
    const testEmail = `admin-test${Date.now()}@example.com`;
    
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        display_name: 'Admin Test User'
      }
    });

    if (userError) {
      console.error('❌ Admin user creation failed:', userError);
      console.log('\n⚠️  The database trigger needs to be fixed in Supabase dashboard.');
      console.log('Please run the SQL script mentioned above.');
      return;
    }

    console.log('✅ Admin user created:', userData.user.id);

    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile NOT created automatically');
      console.log('The trigger is not working. Please run the SQL fix.');
    } else {
      console.log('✅ Profile created automatically!');
      console.log('  - Email:', profile.email);
      console.log('  - Display name:', profile.display_name);
      console.log('  - Beta access:', profile.beta_access);
    }

    // Clean up
    if (userData.user.id) {
      // Delete from profiles first (due to foreign key)
      await supabase.from('profiles').delete().eq('id', userData.user.id);
      // Then delete the user
      await supabase.auth.admin.deleteUser(userData.user.id);
      console.log('🧹 Test user cleaned up');
    }

    // Now test regular signup
    console.log('\n📝 Testing regular signup (anon client)...');
    const anonClient = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MzY5NDEsImV4cCI6MjA2NjMxMjk0MX0.0zQ_B4QQdlN_SqYEQkGL0CTWkQB4LVvIWEhCo7JzNDI'
    );

    const regularTestEmail = `regular-test${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await anonClient.auth.signUp({
      email: regularTestEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          display_name: 'Regular Test User'
        }
      }
    });

    if (signupError) {
      console.error('❌ Regular signup failed:', signupError);
      console.log('\n📋 Next steps:');
      console.log('1. Go to Supabase Auth settings');
      console.log('2. Disable email confirmations for testing');
      console.log('3. Make sure "Allow new users to sign up" is enabled');
    } else if (!signupData.user) {
      console.log('⚠️  Signup succeeded but email confirmation required');
      console.log('Go to Auth settings and disable email confirmations for testing');
    } else {
      console.log('✅ Regular signup successful!');
      console.log('  - User ID:', signupData.user.id);
      console.log('  - Email confirmed:', !!signupData.user.email_confirmed_at);
      
      // Clean up if we can
      if (signupData.user.id) {
        await supabase.from('profiles').delete().eq('id', signupData.user.id);
        await supabase.auth.admin.deleteUser(signupData.user.id);
        console.log('🧹 Test user cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('📄 SQL script location: scripts/fix-auth-trigger.sql\n');
console.log('Testing current state...\n');

testSignupAfterFix().then(() => {
  console.log('\n✅ Testing complete');
  console.log('\nIf signup is still failing:');
  console.log('1. Run the SQL script in Supabase dashboard');
  console.log('2. Check Auth settings (disable email confirmations)');
  console.log('3. Make sure the SUPABASE_SERVICE_KEY env var is set');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});