import { createClient } from '@supabase/supabase-js';
import { supabase as adminSupabase } from './supabase-admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create anonymous client (like frontend)
const anonSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function comprehensiveSystemTest() {
  console.log('=' .repeat(80));
  console.log('🧪 COMPREHENSIVE WAITLIST SYSTEM TEST');
  console.log('=' .repeat(80));
  
  const results = {
    submission: false,
    adminAuth: false,
    approval: false,
    capacity: false
  };
  
  // TEST 1: Waitlist Submission
  console.log('\n📝 TEST 1: WAITLIST SUBMISSION');
  console.log('-'.repeat(40));
  
  const testEmail = `system-test-${Date.now()}@example.com`;
  const submissionData = {
    email: testEmail,
    display_name: 'System Test User',
    city_region: 'San Francisco, CA',
    score: 85,
    status: 'pending',
    answers: {
      role: 'golfer',
      share_channels: ['instagram', 'reddit'],
      learn_channels: ['youtube'],
      spend_bracket: '1500_3000',
      uses: ['discover gear', 'share setup'],
      buy_frequency: 'few_per_year',
      share_frequency: 'monthly',
      termsAccepted: true
    }
  };
  
  console.log('Testing anonymous submission...');
  const { data: submitData, error: submitError } = await anonSupabase
    .from('waitlist_applications')
    .insert(submissionData)
    .select();
  
  if (submitError) {
    console.log('❌ Submission failed:', submitError.message);
    console.log('\n⚠️  FIX REQUIRED:');
    console.log('Run NUCLEAR-RLS-RESET.sql in Supabase Dashboard');
  } else {
    console.log('✅ Submission successful!');
    console.log('   Application ID:', submitData[0].id);
    results.submission = true;
  }
  
  // TEST 2: Admin Authentication
  console.log('\n👨‍💼 TEST 2: ADMIN AUTHENTICATION');
  console.log('-'.repeat(40));
  
  // Check if admin user is properly configured
  const adminUserId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // From audit
  
  console.log('Checking admin status via profiles.is_admin...');
  const { data: adminProfile, error: adminError } = await adminSupabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('id', adminUserId)
    .single();
  
  if (adminError || !adminProfile?.is_admin) {
    console.log('❌ Admin not configured properly');
  } else {
    console.log('✅ Admin authentication working!');
    console.log('   Admin email:', adminProfile.email);
    results.adminAuth = true;
  }
  
  // TEST 3: Approval Function
  console.log('\n✅ TEST 3: APPROVAL FUNCTION');
  console.log('-'.repeat(40));
  
  if (results.submission) {
    console.log('Testing approval function...');
    const { data: approvalResult, error: approvalError } = await adminSupabase
      .rpc('approve_user_by_email_if_capacity', {
        p_email: testEmail,
        p_display_name: 'System Test User',
        p_grant_invites: false
      });
    
    if (approvalError) {
      console.log('❌ Approval function error:', approvalError.message);
    } else if (approvalResult?.success) {
      console.log('✅ Approval function working!');
      console.log('   Result:', approvalResult.message);
      results.approval = true;
    } else {
      console.log('⚠️  Approval returned:', approvalResult);
    }
  } else {
    console.log('⏭️  Skipped (submission failed)');
  }
  
  // TEST 4: Capacity Check
  console.log('\n📊 TEST 4: CAPACITY CHECK');
  console.log('-'.repeat(40));
  
  const { count: betaCount } = await adminSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true);
  
  const { count: pendingCount } = await adminSupabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  console.log(`Beta users: ${betaCount || 0} / 100`);
  console.log(`Pending applications: ${pendingCount || 0}`);
  
  if (betaCount !== null && pendingCount !== null) {
    console.log('✅ Capacity tracking working!');
    results.capacity = true;
  }
  
  // Cleanup test data
  if (results.submission) {
    await adminSupabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
    console.log('\n🧹 Test data cleaned up');
  }
  
  // FINAL REPORT
  console.log('\n' + '=' .repeat(80));
  console.log('📊 SYSTEM TEST REPORT');
  console.log('=' .repeat(80));
  
  const testItems = [
    { name: 'Waitlist Submission', passed: results.submission, critical: true },
    { name: 'Admin Authentication', passed: results.adminAuth, critical: true },
    { name: 'Approval Function', passed: results.approval, critical: false },
    { name: 'Capacity Tracking', passed: results.capacity, critical: false }
  ];
  
  testItems.forEach(test => {
    const icon = test.passed ? '✅' : (test.critical ? '❌' : '⚠️');
    const status = test.passed ? 'PASSED' : (test.critical ? 'FAILED' : 'WARNING');
    console.log(`${icon} ${test.name}: ${status}`);
  });
  
  const criticalPassed = testItems.filter(t => t.critical).every(t => t.passed);
  const allPassed = testItems.every(t => t.passed);
  
  console.log('\n' + '=' .repeat(80));
  
  if (allPassed) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('The waitlist system is fully functional.');
  } else if (criticalPassed) {
    console.log('⚠️  CORE SYSTEMS WORKING');
    console.log('Critical features work but some issues remain.');
  } else {
    console.log('❌ CRITICAL FAILURES DETECTED');
    console.log('\nIMMADIATE ACTION REQUIRED:');
    if (!results.submission) {
      console.log('1. Run NUCLEAR-RLS-RESET.sql in Supabase Dashboard');
    }
    if (!results.adminAuth) {
      console.log('2. Ensure profiles.is_admin is set for admin users');
    }
  }
  
  console.log('=' .repeat(80));
}

comprehensiveSystemTest();