import { supabase } from './supabase-admin.js';

async function verifyDisplayNameFix() {
  console.log('🔍 Verifying display_name constraint fix...\n');
  
  try {
    // Check if we can access the profiles table structure
    const { data: profileSample, error: sampleError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .limit(3);
      
    if (sampleError) {
      console.error('❌ Error accessing profiles table:', sampleError);
      return;
    }
    
    console.log('✅ Profiles table accessible');
    console.log('Sample profiles data:');
    console.table(profileSample);
    
    // Check for any profiles with null or empty display_name
    const { data: nullDisplayNames, error: nullError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .or('display_name.is.null,display_name.eq.');
      
    if (nullError) {
      console.log('⚠️  Could not check for null display_names:', nullError.message);
    } else if (nullDisplayNames && nullDisplayNames.length > 0) {
      console.log('\n⚠️  Found profiles with null/empty display_name:');
      console.table(nullDisplayNames);
      console.log('These should be fixed by the trigger when updated.');
    } else {
      console.log('\n✅ No profiles found with null/empty display_name');
    }
    
    // Test inserting a new profile (if allowed)
    console.log('\n🧪 Testing profile creation without display_name...');
    const testId = `test-${Date.now()}`;
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        username: `testuser${Date.now()}`,
        // intentionally not setting display_name
      })
      .select()
      .single();
      
    if (insertError) {
      if (insertError.code === '23502') {
        console.log('❌ display_name is still required (NOT NULL constraint not fixed)');
      } else {
        console.log('⚠️  Profile insert test failed:', insertError.message);
      }
    } else {
      console.log('✅ Profile created successfully with default display_name:');
      console.log(`   Username: ${newProfile.username}`);
      console.log(`   Display Name: "${newProfile.display_name}"`);
      
      // Clean up test profile
      await supabase.from('profiles').delete().eq('id', testId);
      console.log('   (Test profile cleaned up)');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

console.log('🚀 Verifying display_name constraint fix...\n');
verifyDisplayNameFix();