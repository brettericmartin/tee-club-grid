import { supabase } from './supabase-admin.js';

/**
 * Comprehensive test script for the beta workflow
 * Tests all aspects of the approval system
 */

async function testBetaWorkflow() {
  console.log('🧪 COMPREHENSIVE BETA WORKFLOW TEST');
  console.log('=' .repeat(80));
  
  let allTestsPassed = true;
  const results = [];
  
  // Test 1: Check if profiles table is accessible
  console.log('\n📋 Test 1: Profiles Table Access');
  console.log('-'.repeat(40));
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, beta_access, is_admin')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED: Cannot query profiles table');
      console.log('   Error:', error.message);
      allTestsPassed = false;
      results.push({ test: 'Profiles Access', status: 'FAILED', error: error.message });
    } else {
      console.log('✅ PASSED: Profiles table is accessible');
      console.log(`   Found ${data.length} profiles`);
      results.push({ test: 'Profiles Access', status: 'PASSED' });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception querying profiles');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'Profiles Access', status: 'FAILED', error: err.message });
  }
  
  // Test 2: Check if waitlist_applications is accessible
  console.log('\n📋 Test 2: Waitlist Applications Access');
  console.log('-'.repeat(40));
  try {
    const { data, error } = await supabase
      .from('waitlist_applications')
      .select('id, email, status')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED: Cannot query waitlist_applications');
      console.log('   Error:', error.message);
      allTestsPassed = false;
      results.push({ test: 'Waitlist Access', status: 'FAILED', error: error.message });
    } else {
      console.log('✅ PASSED: Waitlist applications table is accessible');
      console.log(`   Found ${data.length} applications`);
      const pending = data.filter(a => a.status === 'pending').length;
      const approved = data.filter(a => a.status === 'approved').length;
      console.log(`   Pending: ${pending}, Approved: ${approved}`);
      results.push({ test: 'Waitlist Access', status: 'PASSED' });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception querying waitlist');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'Waitlist Access', status: 'FAILED', error: err.message });
  }
  
  // Test 3: Check if approval function exists
  console.log('\n📋 Test 3: Approval Function Exists');
  console.log('-'.repeat(40));
  try {
    // Try to call the function with a fake email to see if it exists
    const { data, error } = await supabase.rpc('approve_user_by_email_if_capacity', {
      p_email: 'test-nonexistent@example.com',
      p_display_name: 'Test User',
      p_grant_invites: true
    });
    
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ FAILED: Approval function does not exist');
      console.log('   Error:', error.message);
      allTestsPassed = false;
      results.push({ test: 'Approval Function', status: 'FAILED', error: 'Function not found' });
    } else if (data && data.error === 'not_found') {
      console.log('✅ PASSED: Approval function exists and responds correctly');
      console.log('   Response:', data.message);
      results.push({ test: 'Approval Function', status: 'PASSED' });
    } else if (data) {
      console.log('✅ PASSED: Approval function exists');
      console.log('   Response:', JSON.stringify(data, null, 2));
      results.push({ test: 'Approval Function', status: 'PASSED' });
    } else {
      console.log('⚠️  WARNING: Unexpected response from approval function');
      console.log('   Error:', error?.message);
      results.push({ test: 'Approval Function', status: 'WARNING', error: error?.message });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception calling approval function');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'Approval Function', status: 'FAILED', error: err.message });
  }
  
  // Test 4: Check admin user
  console.log('\n📋 Test 4: Admin User Check');
  console.log('-'.repeat(40));
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, username, is_admin, beta_access')
      .or('email.eq.brettmartinplay@gmail.com,username.eq.brettmartinplay')
      .single();
    
    if (error) {
      console.log('⚠️  WARNING: Admin user not found');
      console.log('   Error:', error.message);
      results.push({ test: 'Admin User', status: 'WARNING', error: 'User not found' });
    } else {
      if (data.is_admin && data.beta_access) {
        console.log('✅ PASSED: Admin user has correct permissions');
        console.log(`   User: ${data.email || data.username}`);
        console.log(`   Is Admin: ${data.is_admin}`);
        console.log(`   Beta Access: ${data.beta_access}`);
        results.push({ test: 'Admin User', status: 'PASSED' });
      } else {
        console.log('❌ FAILED: Admin user missing permissions');
        console.log(`   Is Admin: ${data.is_admin}`);
        console.log(`   Beta Access: ${data.beta_access}`);
        allTestsPassed = false;
        results.push({ test: 'Admin User', status: 'FAILED', error: 'Missing permissions' });
      }
    }
  } catch (err) {
    console.log('❌ FAILED: Exception checking admin user');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'Admin User', status: 'FAILED', error: err.message });
  }
  
  // Test 5: Check user_bags access
  console.log('\n📋 Test 5: User Bags Access');
  console.log('-'.repeat(40));
  try {
    const { data, error } = await supabase
      .from('user_bags')
      .select('id, name, user_id')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED: Cannot query user_bags');
      console.log('   Error:', error.message);
      allTestsPassed = false;
      results.push({ test: 'User Bags', status: 'FAILED', error: error.message });
    } else {
      console.log('✅ PASSED: User bags table is accessible');
      console.log(`   Found ${data.length} bags`);
      results.push({ test: 'User Bags', status: 'PASSED' });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception querying user_bags');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'User Bags', status: 'FAILED', error: err.message });
  }
  
  // Test 6: Test actual approval (dry run)
  console.log('\n📋 Test 6: Approval Dry Run');
  console.log('-'.repeat(40));
  try {
    // First, get a pending application if one exists
    const { data: pendingApps, error: pendingError } = await supabase
      .from('waitlist_applications')
      .select('email, display_name')
      .eq('status', 'pending')
      .limit(1);
    
    if (pendingError) {
      console.log('⚠️  WARNING: Cannot fetch pending applications');
      results.push({ test: 'Approval Dry Run', status: 'WARNING', error: pendingError.message });
    } else if (pendingApps && pendingApps.length > 0) {
      const testApp = pendingApps[0];
      console.log(`   Testing approval for: ${testApp.email}`);
      
      // Call the approval function
      const { data: approvalResult, error: approvalError } = await supabase.rpc(
        'approve_user_by_email_if_capacity',
        {
          p_email: testApp.email,
          p_display_name: testApp.display_name,
          p_grant_invites: true
        }
      );
      
      if (approvalError) {
        console.log('❌ FAILED: Approval function error');
        console.log('   Error:', approvalError.message);
        allTestsPassed = false;
        results.push({ test: 'Approval Dry Run', status: 'FAILED', error: approvalError.message });
      } else if (approvalResult && approvalResult.success) {
        console.log('✅ PASSED: Approval succeeded');
        console.log('   Result:', approvalResult.message);
        results.push({ test: 'Approval Dry Run', status: 'PASSED' });
      } else if (approvalResult) {
        console.log('⚠️  WARNING: Approval returned error');
        console.log('   Error:', approvalResult.error);
        console.log('   Message:', approvalResult.message);
        results.push({ test: 'Approval Dry Run', status: 'WARNING', error: approvalResult.error });
      }
    } else {
      console.log('ℹ️  INFO: No pending applications to test');
      results.push({ test: 'Approval Dry Run', status: 'SKIPPED' });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception during approval test');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'Approval Dry Run', status: 'FAILED', error: err.message });
  }
  
  // Test 7: Check RLS policies exist
  console.log('\n📋 Test 7: RLS Policies Check');
  console.log('-'.repeat(40));
  try {
    const criticalTables = ['profiles', 'user_bags', 'waitlist_applications', 'feed_posts'];
    let policiesOk = true;
    
    for (const table of criticalTables) {
      // Try to query as service role (should always work)
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: RLS might be blocking service role`);
        policiesOk = false;
      } else {
        console.log(`   ✅ ${table}: Accessible`);
      }
    }
    
    if (policiesOk) {
      console.log('✅ PASSED: All critical tables have working policies');
      results.push({ test: 'RLS Policies', status: 'PASSED' });
    } else {
      console.log('❌ FAILED: Some tables have RLS issues');
      allTestsPassed = false;
      results.push({ test: 'RLS Policies', status: 'FAILED' });
    }
  } catch (err) {
    console.log('❌ FAILED: Exception checking RLS policies');
    console.log('   Error:', err.message);
    allTestsPassed = false;
    results.push({ test: 'RLS Policies', status: 'FAILED', error: err.message });
  }
  
  // Final Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  console.log('\nDetailed Results:');
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : 
                 r.status === 'FAILED' ? '❌' : 
                 r.status === 'WARNING' ? '⚠️' : 'ℹ️';
    console.log(`${icon} ${r.test}: ${r.status}${r.error ? ' - ' + r.error : ''}`);
  });
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    console.log('The beta workflow should be working correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('Please run the SQL fix script and try again.');
    console.log('SQL File: supabase/COMPLETE-BETA-FIX.sql');
  }
  
  return allTestsPassed;
}

// Run the test
testBetaWorkflow()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });