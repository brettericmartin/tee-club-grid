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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🔍 COMPLETE WAITLIST FLOW TEST');
console.log('================================================================================\n');

async function testCompleteFlow() {
  const testEmail = `flow-test-${Date.now()}@example.com`;
  let success = true;
  
  try {
    // 1. Anonymous user submits waitlist application
    console.log('📋 Test 1: Anonymous Waitlist Submission');
    console.log('   Submitting as anonymous user...');
    
    const { data: submission, error: submitError } = await supabaseAnon
      .from('waitlist_applications')
      .insert({
        email: testEmail,
        display_name: 'Flow Test User',
        city_region: 'Test City, CA',
        status: 'pending',
        score: 85,
        answers: {
          role: 'golfer',
          spend_bracket: '1500_3000',
          buy_frequency: 'monthly',
          share_frequency: 'weekly'
        }
      })
      .select()
      .single();
    
    if (submitError) {
      console.log(`   ❌ Submission failed: ${submitError.message}`);
      success = false;
    } else {
      console.log(`   ✅ Submission successful (ID: ${submission.id})`);
    }
    
    // 2. Check if submission appears in waitlist
    console.log('\n📋 Test 2: Verify Submission in Database');
    
    const { data: verifySubmission, error: verifyError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (verifyError || !verifySubmission) {
      console.log(`   ❌ Could not find submission: ${verifyError?.message}`);
      success = false;
    } else {
      console.log(`   ✅ Submission found in database`);
      console.log(`      Status: ${verifySubmission.status}`);
      console.log(`      Score: ${verifySubmission.score}`);
    }
    
    // 3. Admin views waitlist
    console.log('\n📋 Test 3: Admin Access to Waitlist');
    
    const { data: waitlistItems, error: listError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('email, status, score')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (listError) {
      console.log(`   ❌ Admin cannot view waitlist: ${listError.message}`);
      success = false;
    } else {
      console.log(`   ✅ Admin can view ${waitlistItems.length} waitlist entries`);
    }
    
    // 4. Admin approves application
    console.log('\n📋 Test 4: Admin Approval Process');
    
    if (submission) {
      const { data: approval, error: approveError } = await supabaseAdmin
        .from('waitlist_applications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', submission.id)
        .select()
        .single();
      
      if (approveError) {
        console.log(`   ❌ Approval failed: ${approveError.message}`);
        success = false;
      } else {
        console.log(`   ✅ Application approved successfully`);
        console.log(`      New status: ${approval.status}`);
      }
    }
    
    // 5. Check beta access capacity
    console.log('\n📋 Test 5: Beta Capacity Check');
    
    const { count: betaCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const { count: pendingCount } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    console.log(`   ✅ Beta users: ${betaCount}/150`);
    console.log(`   ✅ Pending applications: ${pendingCount}`);
    
    const hasCapacity = betaCount < 150;
    console.log(`   ${hasCapacity ? '✅' : '⚠️'} ${hasCapacity ? 'Accepting new users' : 'At capacity'}`);
    
    // 6. Cleanup test data
    console.log('\n📋 Test 6: Cleanup Test Data');
    
    const { error: cleanupError } = await supabaseAdmin
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
    
    if (cleanupError) {
      console.log(`   ⚠️  Could not cleanup test data: ${cleanupError.message}`);
    } else {
      console.log(`   ✅ Test data cleaned up`);
    }
    
    // Summary
    console.log('\n================================================================================');
    console.log('📊 FLOW TEST SUMMARY');
    console.log('================================================================================\n');
    
    if (success) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('\nThe complete waitlist flow is working:');
      console.log('  1. Anonymous users can submit applications');
      console.log('  2. Submissions are stored in database');
      console.log('  3. Admins can view waitlist');
      console.log('  4. Admins can approve applications');
      console.log('  5. Beta capacity is tracked');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('\nPlease review the errors above and fix any issues.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    success = false;
  }
  
  process.exit(success ? 0 : 1);
}

testCompleteFlow();