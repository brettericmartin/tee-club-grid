import { supabase } from './supabase-admin.js';

async function checkWaitlistRLS() {
  console.log('🔍 Checking waitlist_applications RLS policies...\n');

  // Check RLS status
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('run_sql', {
    query: `
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'waitlist_applications'
    `
  }).single();

  if (rlsStatus) {
    console.log('RLS Status:', rlsStatus);
  }

  // Get all policies
  const { data: policies, error: policiesError } = await supabase.rpc('run_sql', {
    query: `
      SELECT 
        pol.polname as policy_name,
        pol.polpermissive as is_permissive,
        pol.polroles::regrole[] as roles,
        pol.polcmd as command,
        pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
        pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
      FROM pg_policy pol
      JOIN pg_class cls ON pol.polrelid = cls.oid
      WHERE cls.relname = 'waitlist_applications'
      ORDER BY pol.polname
    `
  });

  if (policies) {
    console.log('\nCurrent Policies:');
    console.log(JSON.stringify(policies, null, 2));
  }

  // Test insert as anonymous user
  console.log('\n📝 Testing insert as anonymous user...');
  const testData = {
    email: 'test-anon@example.com',
    display_name: 'Test User',
    instagram_handle: '@test',
    equipment_description: 'Test equipment',
    referral_code: 'TEST123'
  };

  const { data: insertResult, error: insertError } = await supabase
    .from('waitlist_applications')
    .insert(testData)
    .select();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('Error details:', insertError);
  } else {
    console.log('✅ Insert successful:', insertResult);
    // Clean up test data
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', 'test-anon@example.com');
  }
}

checkWaitlistRLS();