import { supabase } from './supabase-admin.js';

async function checkExistingFunctions() {
  console.log('🔍 Checking existing database functions...\n');
  
  try {
    // Check for all functions we're trying to create
    const functionsToCheck = [
      'is_admin',
      'submit_waitlist_with_profile', 
      'create_profile_for_waitlist',
      'get_user_beta_status'
    ];
    
    for (const funcName of functionsToCheck) {
      console.log(`\nChecking function: ${funcName}`);
      console.log('-'.repeat(40));
      
      // Try to call the function to see if it exists
      try {
        const { error: callError } = await supabase.rpc(funcName, {});
        if (callError) {
          if (callError.message.includes('does not exist')) {
            console.log('  ❌ Function does not exist');
          } else {
            console.log('  ✅ Function exists (call failed with:', callError.message.substring(0, 50) + '...)');
          }
        } else {
          console.log('  ✅ Function exists and callable');
        }
      } catch (err) {
        console.log('  ⚠️  Could not determine status:', err.message);
      }
    }
    
    // Specifically check is_admin function signature
    console.log('\n\nDetailed check for is_admin function:');
    console.log('-'.repeat(40));
    
    // Try different parameter names
    const paramVariants = [
      { user_id: '00000000-0000-0000-0000-000000000000' },
      { p_user_id: '00000000-0000-0000-0000-000000000000' },
      { id: '00000000-0000-0000-0000-000000000000' }
    ];
    
    for (const params of paramVariants) {
      try {
        const { data, error } = await supabase.rpc('is_admin', params);
        if (!error) {
          console.log(`  ✅ Works with parameter: ${Object.keys(params)[0]}`);
          break;
        } else if (error.message.includes('does not exist')) {
          console.log(`  ❌ Function with parameter ${Object.keys(params)[0]} does not exist`);
        } else {
          console.log(`  ⚠️  Parameter ${Object.keys(params)[0]}: ${error.message.substring(0, 50)}`);
        }
      } catch (err) {
        console.log(`  ⚠️  Error testing ${Object.keys(params)[0]}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExistingFunctions().then(() => {
  console.log('\n✨ Check complete!');
});