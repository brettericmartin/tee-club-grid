import { supabase } from './supabase-admin.js';

async function checkProfilesRecursion() {
  console.log('🔍 CHECKING FOR PROFILES RECURSION ISSUE');
  console.log('=' .repeat(80));
  
  try {
    // Check if there's a profiles view that might reference itself
    console.log('\n1. Checking for views named profiles...');
    const { data: views, error: viewError } = await supabase
      .from('pg_views')
      .select('viewname, definition')
      .eq('schemaname', 'public')
      .eq('viewname', 'profiles');
    
    if (views && views.length > 0) {
      console.log('⚠️  Found profiles VIEW (not table)!');
      console.log('Definition:', views[0].definition);
      console.log('\nThis could cause recursion if it references itself!');
    } else {
      console.log('✅ No profiles view found (profiles is a table)');
    }
    
    // Check for functions that might be recursive
    console.log('\n2. Checking for recursive functions...');
    const functionNames = [
      'get_profile_by_email',
      'getProfileByEmail', 
      'fetch_profile_by_email'
    ];
    
    for (const fname of functionNames) {
      const { data: funcs, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', fname.toLowerCase());
      
      if (funcs && funcs.length > 0) {
        console.log(`⚠️  Found function: ${fname}`);
        console.log('   This might be causing the recursion');
      }
    }
    
    // Try to query profiles directly
    console.log('\n3. Testing direct profiles query...');
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    if (testError) {
      console.log('❌ Error querying profiles:', testError.message);
      if (testError.message.includes('infinite recursion')) {
        console.log('   CONFIRMED: Infinite recursion detected!');
      }
    } else {
      console.log('✅ Direct profiles query works');
    }
    
    // Check for triggers that might cause issues
    console.log('\n4. Skipping trigger check (not critical)');
    
  } catch (error) {
    console.error('Error during check:', error);
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. If there\'s a profiles view, it might be querying itself');
  console.log('2. Check for any custom functions that query profiles');
  console.log('3. Look for RLS policies that might reference profiles recursively');
  console.log('4. The error mentions getProfileByEmail - this function might be the issue');
}

checkProfilesRecursion();
