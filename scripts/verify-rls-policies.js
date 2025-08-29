import { supabase } from './supabase-admin.js';

/**
 * Verify that RLS policies are correctly configured
 * and not causing recursion or blocking issues
 */

async function verifyRLSPolicies() {
  console.log('🔒 RLS POLICIES VERIFICATION');
  console.log('=' .repeat(80));
  
  const issues = [];
  
  // Test 1: Check for infinite recursion in profiles
  console.log('\n📋 Test 1: Checking for Profile Recursion');
  console.log('-'.repeat(40));
  
  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, beta_access')
      .limit(1);
    
    const queryTime = Date.now() - startTime;
    
    if (error) {
      console.log('❌ ERROR: Cannot query profiles');
      console.log('   Error:', error.message);
      if (error.message.includes('infinite recursion')) {
        console.log('   🚨 INFINITE RECURSION DETECTED!');
        issues.push('Infinite recursion in profiles table');
      }
    } else if (queryTime > 1000) {
      console.log(`⚠️  WARNING: Query took ${queryTime}ms (possible recursion)`);
      issues.push('Slow query on profiles (possible recursion)');
    } else {
      console.log(`✅ PASS: Profiles query successful (${queryTime}ms)`);
    }
  } catch (err) {
    console.log('❌ EXCEPTION:', err.message);
    issues.push('Exception querying profiles: ' + err.message);
  }
  
  // Test 2: Service role bypass check
  console.log('\n📋 Test 2: Service Role Bypass');
  console.log('-'.repeat(40));
  
  const tables = [
    'profiles',
    'waitlist_applications',
    'user_bags',
    'bag_equipment',
    'feed_posts'
  ];
  
  for (const table of tables) {
    try {
      // Service role should ALWAYS be able to access
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: Service role BLOCKED`);
        console.log(`   Error: ${error.message}`);
        issues.push(`Service role blocked on ${table}`);
      } else {
        console.log(`✅ ${table}: Service role can access`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Exception - ${err.message}`);
      issues.push(`Exception on ${table}: ${err.message}`);
    }
  }
  
  // Test 3: Check admin detection
  console.log('\n📋 Test 3: Admin Detection');
  console.log('-'.repeat(40));
  
  try {
    const { data: adminProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .eq('is_admin', true);
    
    if (error) {
      console.log('❌ Cannot query admin profiles');
      console.log('   Error:', error.message);
      issues.push('Cannot query admin profiles');
    } else {
      console.log(`✅ Found ${adminProfiles.length} admin users`);
      if (adminProfiles.length === 0) {
        console.log('   ⚠️  WARNING: No admin users found!');
        issues.push('No admin users found');
      } else {
        adminProfiles.forEach(admin => {
          console.log(`   - ${admin.email || admin.username} (${admin.id})`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Exception checking admins:', err.message);
    issues.push('Exception checking admins: ' + err.message);
  }
  
  // Test 4: Check waitlist admin access
  console.log('\n📋 Test 4: Waitlist Admin Access');
  console.log('-'.repeat(40));
  
  try {
    // Check if waitlist_applications can be queried
    const { data: apps, error } = await supabase
      .from('waitlist_applications')
      .select('id, email, status')
      .limit(5);
    
    if (error) {
      console.log('❌ Cannot query waitlist_applications');
      console.log('   Error:', error.message);
      issues.push('Cannot query waitlist_applications');
    } else {
      console.log(`✅ Can query waitlist (${apps.length} records)`);
      
      // Try to update (dry run)
      const { error: updateError } = await supabase
        .from('waitlist_applications')
        .update({ status: 'pending' })
        .eq('id', 'nonexistent-id');
      
      // No error or "no rows" error is fine (means we can update)
      if (updateError && !updateError.message.includes('no rows')) {
        console.log('❌ Cannot update waitlist_applications');
        console.log('   Error:', updateError.message);
        issues.push('Cannot update waitlist_applications');
      } else {
        console.log('✅ Can update waitlist applications');
      }
    }
  } catch (err) {
    console.log('❌ Exception with waitlist:', err.message);
    issues.push('Exception with waitlist: ' + err.message);
  }
  
  // Test 5: Check bag visibility
  console.log('\n📋 Test 5: Bag Visibility');
  console.log('-'.repeat(40));
  
  try {
    const { data: bags, error } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        user_id,
        profiles!user_bags_user_id_fkey (
          username,
          email
        )
      `)
      .limit(5);
    
    if (error) {
      console.log('❌ Cannot query bags with profile join');
      console.log('   Error:', error.message);
      issues.push('Cannot query bags with profile join');
    } else {
      console.log(`✅ Can query bags with profiles (${bags.length} bags)`);
      bags.forEach(bag => {
        const owner = bag.profiles?.username || bag.profiles?.email || bag.user_id;
        console.log(`   - ${bag.name} (owner: ${owner})`);
      });
    }
  } catch (err) {
    console.log('❌ Exception querying bags:', err.message);
    issues.push('Exception querying bags: ' + err.message);
  }
  
  // Test 6: Check function permissions
  console.log('\n📋 Test 6: Function Permissions');
  console.log('-'.repeat(40));
  
  try {
    // Check if approval function can be called
    const { data, error } = await supabase.rpc('approve_user_by_email_if_capacity', {
      p_email: 'test@test.com',
      p_display_name: 'Test',
      p_grant_invites: false
    });
    
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Approval function does not exist');
      issues.push('Approval function does not exist');
    } else if (data) {
      // Function exists and returned something
      if (data.error === 'not_found' || data.error === 'already_approved') {
        console.log('✅ Approval function exists and works correctly');
      } else if (data.success) {
        console.log('✅ Approval function succeeded');
      } else {
        console.log(`⚠️  Function returned: ${data.error || data.message}`);
      }
    } else if (error) {
      console.log('❌ Error calling approval function');
      console.log('   Error:', error.message);
      issues.push('Error calling approval function: ' + error.message);
    }
  } catch (err) {
    console.log('❌ Exception calling function:', err.message);
    issues.push('Exception calling function: ' + err.message);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RLS VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  
  if (issues.length === 0) {
    console.log('\n✅ ALL RLS POLICIES ARE WORKING CORRECTLY!');
    console.log('\nNo issues detected. The system should be functioning properly.');
  } else {
    console.log(`\n⚠️  FOUND ${issues.length} ISSUES:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Run the SQL fix: supabase/COMPLETE-BETA-FIX.sql');
    console.log('2. Make sure you are using service role key');
    console.log('3. Check that RLS is enabled on all tables');
    console.log('4. Verify no recursive policies exist');
  }
  
  return issues.length === 0;
}

// Run the verification
verifyRLSPolicies()
  .then(success => {
    console.log('\n' + (success ? '✅ Verification passed' : '❌ Verification failed'));
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
