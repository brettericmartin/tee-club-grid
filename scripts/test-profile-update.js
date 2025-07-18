import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileOperations() {
  console.log('🔍 Testing Profile Operations...\n');

  // Test user credentials
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';

  try {
    // 1. Sign in or create test user
    console.log('1️⃣ Signing in test user...');
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError && authError.message.includes('Invalid login')) {
      console.log('   Creating new test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            username: 'testuser'
          }
        }
      });
      
      if (signUpError) {
        console.error('❌ Error creating user:', signUpError);
        return;
      }
      
      authData = signUpData;
    }

    if (!authData?.user) {
      console.error('❌ No user data returned');
      return;
    }

    const userId = authData.user.id;
    console.log(`✅ Authenticated as user: ${userId}`);

    // 2. Check if profile exists
    console.log('\n2️⃣ Checking if profile exists...');
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', selectError);
    }

    if (!existingProfile) {
      console.log('   Profile does not exist, creating...');
      
      // Try to create profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: authData.user.user_metadata.username || 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        console.error('   Details:', JSON.stringify(insertError, null, 2));
        return;
      }

      console.log('✅ Profile created successfully');
    } else {
      console.log('✅ Profile exists:', existingProfile.username);
    }

    // 3. Test profile update
    console.log('\n3️⃣ Testing profile update...');
    const updates = {
      full_name: 'Test User ' + Date.now(),
      handicap: 15.5,
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      console.error('   Details:', JSON.stringify(updateError, null, 2));
      return;
    }

    console.log('✅ Profile updated successfully:', updatedProfile);

    // 4. Test storage bucket access
    console.log('\n4️⃣ Testing storage bucket access...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
    } else {
      console.log('✅ Available buckets:', buckets?.map(b => b.name).join(', '));
      
      const userContentBucket = buckets?.find(b => b.name === 'user-content');
      if (!userContentBucket) {
        console.log('⚠️  user-content bucket not found!');
        console.log('   Please run: sql/create-user-content-bucket.sql');
      } else {
        console.log('✅ user-content bucket exists');
      }
    }

    // 5. Test avatar upload
    console.log('\n5️⃣ Testing avatar upload...');
    const testFileName = `avatars/${userId}-test.txt`;
    const testContent = 'Test avatar content';
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error uploading to storage:', uploadError);
      console.error('   Details:', JSON.stringify(uploadError, null, 2));
    } else {
      console.log('✅ Test file uploaded successfully');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(testFileName);
      
      console.log('   Public URL:', urlData.publicUrl);
      
      // Clean up test file
      await supabase.storage
        .from('user-content')
        .remove([testFileName]);
    }

    // 6. Check RLS policies
    console.log('\n6️⃣ Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'profiles' });

    if (policyError) {
      console.log('   Could not check policies (requires admin access)');
    } else if (policies) {
      console.log('   Profile policies:', policies);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    // Sign out
    await supabase.auth.signOut();
  }
}

// Add RPC function helper
console.log('\n📝 If get_policies_for_table fails, create this function in Supabase:');
console.log(`
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
RETURNS TABLE(policyname name, cmd text, qual text, with_check text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.policyname, p.cmd::text, p.qual::text, p.with_check::text
  FROM pg_policies p
  WHERE p.tablename = table_name;
END;
$$;
`);

testProfileOperations();