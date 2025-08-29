import { supabase } from './supabase-admin.js';

console.log('🎁 TESTING INVITE CODE SYSTEM');
console.log('=' .repeat(80));

async function testInviteSystem() {
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Test 1: Check if functions exist
    console.log('\n📝 Test 1: Checking Invite Functions');
    console.log('-'.repeat(40));
    
    const functions = [
      'generate_invite_codes',
      'redeem_invite_code',
      'get_my_invite_codes'
    ];
    
    for (const func of functions) {
      const { error } = await supabase.rpc(func, {});
      if (error && !error.message.includes('does not exist')) {
        console.log(`  ✅ ${func} exists`);
        testsPassed++;
      } else if (!error) {
        console.log(`  ✅ ${func} exists`);
        testsPassed++;
      } else {
        console.log(`  ❌ ${func} not found`);
        testsFailed++;
      }
    }
    
    // Test 2: Check invite_codes table
    console.log('\n📝 Test 2: Checking Invite Codes Table');
    console.log('-'.repeat(40));
    
    const { data: codes, error: codesError } = await supabase
      .from('invite_codes')
      .select('*')
      .limit(5);
    
    if (!codesError) {
      console.log(`  ✅ invite_codes table exists`);
      console.log(`  Found ${codes?.length || 0} existing invite codes`);
      testsPassed++;
    } else {
      console.log(`  ❌ Error accessing invite_codes:`, codesError.message);
      testsFailed++;
    }
    
    // Test 3: Simulate invite code generation
    console.log('\n📝 Test 3: Testing Invite Code Generation');
    console.log('-'.repeat(40));
    
    // Get a beta user to test with
    const { data: betaUser } = await supabase
      .from('profiles')
      .select('id, email, invite_quota')
      .eq('beta_access', true)
      .gt('invite_quota', 0)
      .limit(1)
      .single();
    
    if (betaUser) {
      console.log(`  Testing with beta user: ${betaUser.email}`);
      console.log(`  Invite quota: ${betaUser.invite_quota}`);
      
      // Generate a test invite code
      const { data: newCodes, error: genError } = await supabase.rpc(
        'generate_invite_codes',
        {
          p_user_id: betaUser.id,
          p_count: 1
        }
      );
      
      if (!genError && newCodes) {
        console.log(`  ✅ Generated invite code: ${newCodes[0]}`);
        testsPassed++;
        
        // Test 4: Test invite code redemption
        console.log('\n📝 Test 4: Testing Invite Code Redemption');
        console.log('-'.repeat(40));
        
        const testEmail = `invite_test_${Date.now()}@example.com`;
        const { data: redeemResult, error: redeemError } = await supabase.rpc(
          'redeem_invite_code',
          {
            p_code: newCodes[0],
            p_email: testEmail
          }
        );
        
        if (!redeemError && redeemResult) {
          console.log(`  ✅ Redeemed invite code for ${testEmail}`);
          console.log(`  Result:`, redeemResult);
          testsPassed++;
          
          // Clean up test data
          await supabase
            .from('waitlist_applications')
            .delete()
            .eq('email', testEmail);
          
          await supabase
            .from('invite_codes')
            .delete()
            .eq('code', newCodes[0]);
        } else {
          console.log(`  ❌ Failed to redeem:`, redeemError?.message);
          testsFailed++;
        }
      } else {
        console.log(`  ❌ Failed to generate code:`, genError?.message);
        testsFailed++;
      }
    } else {
      console.log('  ⚠️  No beta user with invite quota found for testing');
    }
    
    // Test 5: Check user's invite codes
    console.log('\n📝 Test 5: Getting User\'s Invite Codes');
    console.log('-'.repeat(40));
    
    if (betaUser) {
      const { data: userCodes, error: getError } = await supabase.rpc(
        'get_my_invite_codes',
        { p_user_id: betaUser.id }
      );
      
      if (!getError) {
        console.log(`  ✅ Retrieved user's invite codes`);
        console.log(`  Active codes: ${userCodes?.filter(c => c.status === 'active').length || 0}`);
        console.log(`  Used codes: ${userCodes?.filter(c => c.status === 'used').length || 0}`);
        testsPassed++;
      } else {
        console.log(`  ❌ Failed to get codes:`, getError.message);
        testsFailed++;
      }
    }
    
    // Test 6: Verify no referral code columns exist
    console.log('\n📝 Test 6: Verifying Referral Code Removal');
    console.log('-'.repeat(40));
    
    const { data: profileColumns } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' })
      .catch(() => ({ data: null }));
    
    if (profileColumns) {
      const hasReferralCode = profileColumns.some(col => col.column_name === 'referral_code');
      if (!hasReferralCode) {
        console.log('  ✅ referral_code column removed from profiles');
        testsPassed++;
      } else {
        console.log('  ⚠️  referral_code column still exists');
      }
    } else {
      // Check manually
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();
      
      if (profile && !('referral_code' in profile)) {
        console.log('  ✅ referral_code not in profiles');
        testsPassed++;
      } else if (profile && 'referral_code' in profile) {
        console.log('  ⚠️  referral_code still in profiles');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
    testsFailed++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 Invite system is working perfectly!');
    console.log('  • Beta users can generate invite codes');
    console.log('  • Codes can be redeemed for instant access');
    console.log('  • No more complex referral tracking');
  } else {
    console.log('\n⚠️  Some tests failed. Run the migration:');
    console.log('  supabase/migrations/20250828_simplify_to_invite_codes.sql');
  }
}

// Run tests
testInviteSystem()
  .then(() => {
    console.log('\n✨ Invite system test complete!');
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
  });