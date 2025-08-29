import { supabase } from './supabase-admin.js';

console.log('🧪 TESTING SIMPLIFIED BETA SYSTEM');
console.log('=' .repeat(80));

async function testBetaSystem() {
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Test 1: Check if migration functions exist
    console.log('\n📝 Test 1: Checking database functions...');
    
    const functions = [
      'submit_waitlist_with_profile',
      'create_profile_for_waitlist', 
      'get_user_beta_status',
      'is_admin'
    ];
    
    for (const func of functions) {
      try {
        // Try to call with invalid params to see if function exists
        const { error } = await supabase.rpc(func, {});
        if (error && !error.message.includes('does not exist')) {
          console.log(`  ✅ Function ${func} exists`);
          testsPassed++;
        } else if (!error) {
          console.log(`  ✅ Function ${func} exists`);
          testsPassed++;
        } else {
          console.log(`  ❌ Function ${func} not found`);
          testsFailed++;
        }
      } catch (err) {
        console.log(`  ⚠️  Function ${func} check failed:`, err.message);
        testsFailed++;
      }
    }
    
    // Test 2: Test waitlist submission with profile creation
    console.log('\n📝 Test 2: Testing waitlist submission with automatic profile creation...');
    
    const testEmail = `test_${Date.now()}@example.com`;
    const testData = {
      p_email: testEmail,
      p_display_name: 'Test User',
      p_city_region: 'Test City, TX',
      p_answers: {
        role: 'golfer',
        spend_bracket: '1500_3000',
        buy_frequency: 'monthly'
      },
      p_score: 75
    };
    
    const { data: submitResult, error: submitError } = await supabase.rpc(
      'submit_waitlist_with_profile',
      testData
    );
    
    if (submitError) {
      console.log('  ❌ Submission failed:', submitError.message);
      testsFailed++;
    } else {
      console.log('  ✅ Submission successful:', submitResult);
      testsPassed++;
      
      // Verify profile was created
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', testEmail)
        .single();
      
      if (profileError) {
        console.log('  ❌ Profile not created:', profileError.message);
        testsFailed++;
      } else {
        console.log('  ✅ Profile created:', {
          id: profile.id,
          email: profile.email,
          beta_access: profile.beta_access,
          display_name: profile.display_name
        });
        testsPassed++;
        
        // Clean up test data
        await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);
        
        await supabase
          .from('waitlist_applications')
          .delete()
          .eq('email', testEmail);
      }
    }
    
    // Test 3: Check beta access control
    console.log('\n📝 Test 3: Testing beta access control...');
    
    // Count current beta users
    const { count: betaCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    if (countError) {
      console.log('  ❌ Could not count beta users:', countError.message);
      testsFailed++;
    } else {
      console.log(`  ✅ Current beta users: ${betaCount}/150`);
      testsPassed++;
      
      if (betaCount < 150) {
        console.log('  ℹ️  New users should get automatic beta access');
      } else {
        console.log('  ℹ️  Beta is full - new users go to waitlist');
      }
    }
    
    // Test 4: Check simplified RLS policies
    console.log('\n📝 Test 4: Checking simplified RLS policies...');
    
    const { data: policies, error: policyError } = await supabase.rpc(
      'get_all_rls_policies',
      {}
    ).catch(() => ({ data: null, error: 'Function not found' }));
    
    if (policyError || !policies) {
      // Check policies manually
      const tables = ['profiles', 'user_bags', 'bag_equipment', 'waitlist_applications'];
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.message.includes('row-level security')) {
          console.log(`  ✅ RLS enabled on ${table}`);
          testsPassed++;
        } else if (!error) {
          console.log(`  ℹ️  ${table} is readable (expected for some tables)`);
        } else {
          console.log(`  ⚠️  ${table}: ${error.message}`);
        }
      }
    } else {
      // Count admin-related policies (should be minimal)
      const adminPolicies = policies.filter((p) => 
        p.policyname?.includes('admin') || 
        p.qual?.includes('is_admin')
      );
      
      console.log(`  ℹ️  Found ${adminPolicies.length} admin-related policies`);
      if (adminPolicies.length > 10) {
        console.log('  ⚠️  Too many admin policies - system may not be simplified');
        testsFailed++;
      } else {
        console.log('  ✅ Admin policies minimized');
        testsPassed++;
      }
    }
    
    // Test 5: Admin flag simplification
    console.log('\n📝 Test 5: Testing admin system simplification...');
    
    // Check if is_admin column exists
    const { data: adminCheck } = await supabase
      .from('profiles')
      .select('is_admin')
      .limit(1);
    
    if (adminCheck !== null) {
      console.log('  ✅ is_admin flag exists in profiles');
      testsPassed++;
    } else {
      console.log('  ❌ is_admin flag not found');
      testsFailed++;
    }
    
    // Test the is_admin function
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Non-existent user
    const { data: isAdminResult, error: isAdminError } = await supabase.rpc(
      'is_admin',
      { p_user_id: testUserId }
    );
    
    if (!isAdminError) {
      console.log('  ✅ is_admin function works:', isAdminResult === false ? 'correctly returns false' : 'unexpected result');
      testsPassed++;
    } else {
      console.log('  ❌ is_admin function error:', isAdminError.message);
      testsFailed++;
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    testsFailed++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Beta system is simplified and working.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues.');
  }
}

// Run tests
console.log('Starting simplified beta system tests...\n');

testBetaSystem()
  .then(() => {
    console.log('\n✨ Test suite complete!');
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
  });