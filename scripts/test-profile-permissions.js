import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('-'.repeat(50));
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`✅ PASSED: ${result.message}`);
      testResults.passed++;
      testResults.tests.push({ name, status: 'passed', message: result.message });
    } else {
      console.log(`❌ FAILED: ${result.message}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      testResults.failed++;
      testResults.tests.push({ name, status: 'failed', message: result.message, error: result.error });
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'error', error: error.message });
  }
}

async function testProfilePermissions() {
  console.log('🔐 Testing Profile System Permissions');
  console.log('====================================\n');
  console.log('📌 URL:', supabaseUrl);
  console.log('📌 Time:', new Date().toLocaleString());
  
  // Test 1: Authentication
  await runTest('User Authentication', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { 
        success: false, 
        message: 'No authenticated user found',
        error: 'Please sign in to the app first'
      };
    }
    
    return { 
      success: true, 
      message: `Authenticated as ${user.email} (${user.id})`
    };
  });

  // Get user for subsequent tests
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('\n⚠️  Cannot continue tests without authentication');
    return;
  }

  // Test 2: Profile Read Permission
  await runTest('Profile Read Permission', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, message: 'Profile does not exist yet (this is normal for new users)' };
      }
      return { success: false, message: 'Cannot read profile', error: error.message };
    }
    
    return { success: true, message: 'Successfully read profile data' };
  });

  // Test 3: Profile Create Permission
  await runTest('Profile Create Permission', async () => {
    // First check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (existing) {
      return { success: true, message: 'Profile already exists (skipping create test)' };
    }
    
    // Try to create profile
    const testUsername = `test_${user.id.substring(0, 8)}_${Date.now()}`;
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: testUsername,
        display_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      return { success: false, message: 'Cannot create profile', error: error.message };
    }
    
    return { success: true, message: 'Successfully created profile' };
  });

  // Test 4: Profile Update Permission
  await runTest('Profile Update Permission', async () => {
    const testDisplayName = `Test ${Date.now()}`;
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: testDisplayName,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (error) {
      return { success: false, message: 'Cannot update profile', error: error.message };
    }
    
    return { success: true, message: 'Successfully updated profile' };
  });

  // Test 5: Storage Bucket Access
  await runTest('Storage Bucket Access', async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return { success: false, message: 'Cannot list storage buckets', error: error.message };
    }
    
    const userContentBucket = buckets?.find(b => b.name === 'user-content');
    if (!userContentBucket) {
      return { success: false, message: 'user-content bucket not found' };
    }
    
    if (!userContentBucket.public) {
      return { success: false, message: 'user-content bucket is not public' };
    }
    
    return { success: true, message: 'user-content bucket exists and is public' };
  });

  // Test 6: Avatar Upload Permission
  await runTest('Avatar Upload Permission', async () => {
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testPath = `avatars/${user.id}/test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testPath, testContent, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      return { success: false, message: 'Cannot upload to storage', error: uploadError.message };
    }
    
    // Clean up
    await supabase.storage.from('user-content').remove([testPath]);
    
    return { success: true, message: 'Successfully uploaded and cleaned up test file' };
  });

  // Test 7: Public URL Access
  await runTest('Public URL Access', async () => {
    const testPath = `avatars/${user.id}/test-image.jpg`;
    const { data } = supabase.storage
      .from('user-content')
      .getPublicUrl(testPath);
    
    if (!data.publicUrl) {
      return { success: false, message: 'Cannot generate public URL' };
    }
    
    // Test if URL format is correct
    if (!data.publicUrl.includes('user-content') || !data.publicUrl.includes(user.id)) {
      return { success: false, message: 'Public URL format is incorrect', error: data.publicUrl };
    }
    
    return { success: true, message: `Public URL generated: ${data.publicUrl}` };
  });

  // Test 8: Cross-User Profile Access
  await runTest('Cross-User Profile Access', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .limit(5);
    
    if (error) {
      return { success: false, message: 'Cannot read other profiles', error: error.message };
    }
    
    return { success: true, message: `Can read ${data?.length || 0} profiles (public access working)` };
  });

  // Test 9: Update Another User's Profile (Should Fail)
  await runTest('Prevent Cross-User Updates', async () => {
    // Find another user's profile
    const { data: otherProfiles } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', user.id)
      .limit(1);
    
    if (!otherProfiles || otherProfiles.length === 0) {
      return { success: true, message: 'No other profiles to test (skipping)' };
    }
    
    const otherUserId = otherProfiles[0].id;
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: 'Hacked!' })
      .eq('id', otherUserId);
    
    if (error) {
      return { success: true, message: 'Correctly prevented updating another user\'s profile' };
    }
    
    return { success: false, message: 'SECURITY ISSUE: Was able to update another user\'s profile!' };
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total:  ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.tests
      .filter(t => t.status === 'failed' || t.status === 'error')
      .forEach(t => {
        console.log(`\n- ${t.name}`);
        console.log(`  Message: ${t.message || 'No message'}`);
        if (t.error) console.log(`  Error: ${t.error}`);
      });
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Run the SQL script: sql/fix-profile-system-complete.sql');
    console.log('2. Ensure you are signed in to the app');
    console.log('3. Check Supabase dashboard for RLS policy status');
    console.log('4. Verify the user-content bucket is set to PUBLIC');
  } else {
    console.log('\n✅ All tests passed! The profile system is working correctly.');
  }
}

// Instructions
console.log('🔐 Profile Permission Tester');
console.log('===========================\n');
console.log('This script tests all profile system permissions.\n');
console.log('Prerequisites:');
console.log('1. Sign in to the app first');
console.log('2. Keep the browser tab open');
console.log('3. Run: node scripts/test-profile-permissions.js\n');

// Run the tests
testProfilePermissions();