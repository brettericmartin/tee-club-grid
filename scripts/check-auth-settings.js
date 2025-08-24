#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kgleorvvtrqlgolzdbbw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDczNjk0MSwiZXhwIjoyMDY2MzEyOTQxfQ.4AT3NIctRyxWmHVSTFXHhxAx3Jz_5DtF9Kbzdg-gvRw';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MzY5NDEsImV4cCI6MjA2NjMxMjk0MX0.0zQ_B4QQdlN_SqYEQkGL0CTWkQB4LVvIWEhCo7JzNDI';

console.log('🔍 Checking Supabase Auth Configuration...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Has Service Key:', !!supabaseServiceKey);
console.log('Has Anon Key:', !!supabaseAnonKey);
console.log('\n');

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create anon client for testing regular signup
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthSettings() {
  try {
    // Test signup with anon client
    console.log('📝 Testing signup with anon client...');
    const testEmail = `test${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          username: 'testuser'
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup failed:', signupError);
      console.log('\nPossible issues:');
      console.log('1. Email confirmations might be required');
      console.log('2. Signups might be disabled in Supabase dashboard');
      console.log('3. API keys might not have proper permissions');
      console.log('4. Rate limiting might be active');
    } else if (!signupData.user) {
      console.log('⚠️ Signup succeeded but no user returned');
      console.log('This usually means email confirmation is required');
    } else {
      console.log('✅ Signup successful!');
      console.log('User ID:', signupData.user.id);
      console.log('Email confirmed:', signupData.user.email_confirmed_at ? 'Yes' : 'No');
      
      // Clean up test user
      if (signupData.user.id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(signupData.user.id);
        if (!deleteError) {
          console.log('🧹 Test user cleaned up');
        }
      }
    }

    // Check feature flags for beta settings
    console.log('\n🎛️ Checking feature flags...');
    const { data: featureFlags, error: flagError } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .single();

    if (flagError) {
      console.error('❌ Could not fetch feature flags:', flagError);
    } else {
      console.log('✅ Feature flags:');
      console.log('  - Public beta enabled:', featureFlags.public_beta_enabled);
      console.log('  - Beta cap:', featureFlags.beta_cap);
      console.log('  - Registration enabled:', featureFlags.registration_enabled !== false);
    }

    // Check current beta access count
    console.log('\n👥 Checking beta access stats...');
    const { count: betaCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);

    if (countError) {
      console.error('❌ Could not count beta users:', countError);
    } else {
      console.log('✅ Current beta users:', betaCount);
    }

    // Check waitlist stats
    console.log('\n📋 Checking waitlist stats...');
    const { data: waitlistStats, error: waitlistError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (waitlistError) {
      console.error('❌ Could not fetch waitlist stats:', waitlistError);
    } else {
      const stats = {
        approved: waitlistStats.filter(w => w.status === 'approved').length,
        pending: waitlistStats.filter(w => w.status === 'pending').length,
        total: waitlistStats.length
      };
      console.log('✅ Recent waitlist applications (last 100):');
      console.log('  - Approved:', stats.approved);
      console.log('  - Pending:', stats.pending);
      console.log('  - Total:', stats.total);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAuthSettings().then(() => {
  console.log('\n✅ Auth check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});