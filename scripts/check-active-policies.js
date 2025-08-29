import { supabase } from './supabase-admin.js';

async function checkActivePolicies() {
  console.log('📋 CHECKING ACTIVE POLICIES ON waitlist_applications');
  console.log('=' .repeat(80));
  
  // Query the database for current policies
  const { data, error } = await supabase
    .from('waitlist_applications')
    .select('*')
    .limit(0); // Just to test connection
  
  if (error && error.message.includes('row-level')) {
    console.log('RLS is ENABLED on the table');
  } else {
    console.log('Table is accessible via service role');
  }
  
  // Try to get policy information via a different method
  console.log('\n🔍 Attempting to retrieve policy information...\n');
  
  // Test what operations work
  console.log('Testing operations with service role:');
  
  // Test insert
  const testEmail = `policy-test-${Date.now()}@example.com`;
  const { data: insertData, error: insertError } = await supabase
    .from('waitlist_applications')
    .insert({
      email: testEmail,
      display_name: 'Policy Test',
      city_region: 'Test',
      score: 0,
      status: 'pending',
      answers: {}
    })
    .select();
  
  if (insertError) {
    console.log('  ❌ INSERT failed:', insertError.message);
  } else {
    console.log('  ✅ INSERT works');
    
    // Clean up
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
  }
  
  // The real issue: Check if the policies were actually created
  console.log('\n⚠️  IMPORTANT: The SQL may not have fully executed.');
  console.log('\nPlease verify in Supabase dashboard:');
  console.log('1. Go to Table Editor > waitlist_applications');
  console.log('2. Click on "RLS Policies" button');
  console.log('3. You should see these policies:');
  console.log('   - "Anyone can submit application" (INSERT)');
  console.log('   - "Users can view own applications" (SELECT)');
  console.log('   - "Only admins can update" (UPDATE)');
  console.log('   - "Only admins can delete" (DELETE)');
  console.log('\nIf these policies are NOT there, the SQL didn\'t execute properly.');
  
  console.log('\n' + '=' .repeat(80));
  console.log('📝 ALTERNATIVE FIX:');
  console.log('\nIf policies are missing, try this simplified version:');
  console.log('\n-- Simple fix to allow submissions');
  console.log('DROP POLICY IF EXISTS "Anyone can submit application" ON waitlist_applications;');
  console.log('CREATE POLICY "Anyone can submit application"');
  console.log('  ON waitlist_applications FOR INSERT');
  console.log('  TO anon, authenticated');
  console.log('  WITH CHECK (true);');
}

checkActivePolicies();