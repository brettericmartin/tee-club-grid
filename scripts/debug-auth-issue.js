#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kgleorvvtrqlgolzdbbw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDczNjk0MSwiZXhwIjoyMDY2MzEyOTQxfQ.4AT3NIctRyxWmHVSTFXHhxAx3Jz_5DtF9Kbzdg-gvRw';

console.log('🔍 Deep Debugging Auth Issue...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuth() {
  try {
    // 1. Check if we can manually insert into profiles
    console.log('1️⃣ Testing manual profile insertion...');
    const testId = crypto.randomUUID();
    const testEmail = `manual-test${Date.now()}@example.com`;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: testEmail,
        display_name: 'Manual Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Cannot insert into profiles:', profileError.message);
      console.log('Details:', profileError);
    } else {
      console.log('✅ Manual profile insert successful');
      // Clean up
      await supabase.from('profiles').delete().eq('id', testId);
      console.log('🧹 Test profile cleaned up');
    }

    // 2. Check profiles table columns
    console.log('\n2️⃣ Checking profiles table structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Cannot read profiles table:', sampleError);
    } else {
      console.log('✅ Profiles table is accessible');
      if (sample && sample.length > 0) {
        console.log('Columns:', Object.keys(sample[0]));
      } else {
        console.log('Table exists but is empty or has no visible rows');
      }
    }

    // 3. Try creating a user without any metadata
    console.log('\n3️⃣ Testing minimal user creation...');
    const minimalEmail = `minimal${Date.now()}@example.com`;
    
    const { data: minimalUser, error: minimalError } = await supabase.auth.admin.createUser({
      email: minimalEmail,
      email_confirm: true
    });

    if (minimalError) {
      console.error('❌ Even minimal user creation fails:', minimalError.message);
      console.log('This suggests a database-level issue');
    } else {
      console.log('✅ Minimal user created!');
      console.log('User ID:', minimalUser.user.id);
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', minimalUser.user.id)
        .single();
      
      if (profile) {
        console.log('✅ Profile was auto-created by trigger');
      } else {
        console.log('❌ Profile was NOT created - trigger not working');
      }
      
      // Clean up
      await supabase.from('profiles').delete().eq('id', minimalUser.user.id);
      await supabase.auth.admin.deleteUser(minimalUser.user.id);
      console.log('🧹 Cleaned up test user');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugAuth().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
});
