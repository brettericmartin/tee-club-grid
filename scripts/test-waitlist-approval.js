import { supabase } from './supabase-admin.js';

async function testWaitlistApproval() {
  console.log('🧪 TESTING WAITLIST APPROVAL SYSTEM');
  console.log('=' .repeat(80));
  
  const testEmail = 'test@test.com';
  
  try {
    // Step 1: Check current waitlist applications
    console.log('\n📋 Step 1: Checking waitlist applications...');
    const { data: applications, error: appError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (appError) {
      console.error('❌ Error fetching applications:', appError.message);
    } else {
      console.log(`✅ Found ${applications.length} waitlist applications`);
      
      const pending = applications.filter(a => a.status === 'pending');
      const approved = applications.filter(a => a.status === 'approved');
      
      console.log(`   - Pending: ${pending.length}`);
      console.log(`   - Approved: ${approved.length}`);
      
      if (pending.length > 0) {
        console.log('\n   Pending applications:');
        pending.slice(0, 5).forEach(app => {
          console.log(`     • ${app.email} - ${app.name || 'No name'}`);
        });
      }
    }
    
    // Step 2: Check if approval function exists
    console.log('\n🔧 Step 2: Testing approval function...');
    
    // First, let's check if there's a test application to approve
    const { data: testApp, error: testAppError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (testAppError || !testApp) {
      console.log(`⚠️  No application found for ${testEmail}`);
      console.log('   Creating a test application...');
      
      // Create a test application
      const { data: newApp, error: createError } = await supabase
        .from('waitlist_applications')
        .insert({
          email: testEmail,
          name: 'Test User',
          status: 'pending',
          how_heard: 'testing',
          equipment_interests: 'Testing the approval system'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Could not create test application:', createError.message);
      } else {
        console.log(`✅ Created test application for ${testEmail}`);
      }
    } else if (testApp.status === 'approved') {
      console.log(`⚠️  Test application already approved. Resetting to pending...`);
      
      // Reset to pending for testing
      const { error: resetError } = await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'pending', 
          approved_at: null 
        })
        .eq('id', testApp.id);
      
      if (resetError) {
        console.error('❌ Could not reset test application:', resetError.message);
      } else {
        console.log('✅ Reset test application to pending');
      }
    } else {
      console.log(`✅ Found pending test application for ${testEmail}`);
    }
    
    // Step 3: Test the approval function
    console.log('\n🚀 Step 3: Testing approval function...');
    
    const { data: approvalResult, error: approvalError } = await supabase
      .rpc('approve_user_by_email_if_capacity', {
        user_email: testEmail
      });
    
    if (approvalError) {
      console.error('❌ Approval function failed:', approvalError.message);
      console.log('\n💡 Likely issues:');
      console.log('   1. RLS policies blocking INSERT on profiles table');
      console.log('   2. Missing columns in profiles table');
      console.log('   3. Function not created or missing permissions');
      console.log('\n📝 Run the fix-rls-and-waitlist.sql script to resolve these issues');
    } else {
      console.log('✅ Approval function executed successfully!');
      console.log('   Result:', JSON.stringify(approvalResult, null, 2));
      
      // Verify the profile was created/updated
      if (approvalResult && approvalResult.success) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', testEmail)
          .single();
        
        if (profile) {
          console.log('\n✅ Profile verified:');
          console.log(`   - ID: ${profile.id}`);
          console.log(`   - Email: ${profile.email}`);
          console.log(`   - Beta Access: ${profile.beta_access}`);
          console.log(`   - Username: ${profile.username}`);
        }
        
        // Check the application status
        const { data: updatedApp, error: checkError } = await supabase
          .from('waitlist_applications')
          .select('*')
          .eq('email', testEmail)
          .single();
        
        if (updatedApp) {
          console.log('\n✅ Application status:');
          console.log(`   - Status: ${updatedApp.status}`);
          console.log(`   - Approved At: ${updatedApp.approved_at}`);
        }
      }
    }
    
    // Step 4: Test RLS policies
    console.log('\n🔒 Step 4: Testing RLS policies...');
    
    // Test if we can insert into profiles
    const testProfileId = 'test-' + Date.now();
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testProfileId,
        email: 'rls-test@example.com',
        username: 'rlstest',
        beta_access: false
      });
    
    if (insertError) {
      if (insertError.message.includes('duplicate key')) {
        console.log('✅ Insert test skipped (profile exists)');
      } else if (insertError.message.includes('row-level security')) {
        console.log('⚠️  RLS blocking INSERT - This is expected for direct inserts');
        console.log('   Service role functions should still work');
      } else {
        console.log('❌ Unexpected insert error:', insertError.message);
      }
    } else {
      console.log('✅ RLS allows INSERT operations');
      
      // Clean up test profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testProfileId);
    }
    
    // Step 5: Summary
    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(80));
    
    const { count: betaCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total profiles: ${totalCount || 0}`);
    console.log(`Beta users: ${betaCount || 0}`);
    console.log(`Capacity remaining: ${100 - (betaCount || 0)}/100`);
    
    // Check RLS status using the helper function if it exists
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_rls_status');
    
    if (!rlsError && rlsStatus) {
      console.log('\n🔒 RLS Status:');
      rlsStatus.forEach(table => {
        const status = table.rls_enabled ? '✅' : '❌';
        console.log(`   ${status} ${table.table_name}: ${table.policy_count} policies`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
  
  console.log('\n✨ Test complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. If errors occurred, run: supabase/fix-rls-and-waitlist.sql');
  console.log('   2. Test the admin dashboard at: /admin/waitlist');
  console.log('   3. Monitor browser console for any API errors');
}

// Run the test
testWaitlistApproval()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });