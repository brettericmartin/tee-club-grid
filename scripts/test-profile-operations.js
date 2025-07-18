const { supabase } = require('./supabase-admin.js');

async function testProfileOperations() {
  console.log('🧪 Testing Profile Operations...\n');

  try {
    // 1. First, get a test user ID (you'll need to replace this with an actual user ID)
    console.log('1️⃣ Checking for existing users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }

    if (!users || users.users.length === 0) {
      console.log('❌ No users found. Create a user first.');
      return;
    }

    const testUser = users.users[0];
    console.log(`   Using test user: ${testUser.email} (${testUser.id})`);

    // 2. Check if profile exists
    console.log('\n2️⃣ Checking if profile exists...');
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching profile:', fetchError.message);
      console.log('   Error details:', fetchError);
    } else if (existingProfile) {
      console.log('✅ Profile exists:', {
        id: existingProfile.id,
        username: existingProfile.username,
        full_name: existingProfile.full_name,
        avatar_url: existingProfile.avatar_url
      });
    } else {
      console.log('ℹ️  No profile found for this user');
    }

    // 3. Test INSERT operation (if no profile exists)
    if (!existingProfile) {
      console.log('\n3️⃣ Testing INSERT operation...');
      const testUsername = `testuser_${Date.now()}`;
      
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: testUser.id,
          username: testUsername,
          full_name: 'Test User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ INSERT failed:', insertError.message);
        console.log('   Error details:', insertError);
        console.log('\n   Possible causes:');
        console.log('   - RLS policy for INSERT is missing or incorrect');
        console.log('   - User ID mismatch in WITH CHECK clause');
        console.log('   - Missing column permissions');
      } else {
        console.log('✅ INSERT successful:', insertData);
      }
    }

    // 4. Test UPDATE operation
    console.log('\n4️⃣ Testing UPDATE operation...');
    const updateData = {
      full_name: `Updated at ${new Date().toISOString()}`,
      bio: 'Testing profile update',
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', testUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ UPDATE failed:', updateError.message);
      console.log('   Error details:', updateError);
      console.log('\n   Possible causes:');
      console.log('   - RLS policy for UPDATE is missing or incorrect');
      console.log('   - USING clause not matching auth.uid() = id');
      console.log('   - WITH CHECK clause preventing update');
    } else {
      console.log('✅ UPDATE successful:', updateResult);
    }

    // 5. Test avatar_url update specifically
    console.log('\n5️⃣ Testing avatar_url update...');
    const testAvatarUrl = `https://example.com/avatar-${Date.now()}.jpg`;
    
    const { data: avatarUpdate, error: avatarError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: testAvatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUser.id)
      .select('id, username, avatar_url')
      .single();

    if (avatarError) {
      console.error('❌ Avatar URL update failed:', avatarError.message);
      console.log('   This is the most common issue!');
    } else {
      console.log('✅ Avatar URL updated:', avatarUpdate);
    }

    // 6. Test storage bucket access
    console.log('\n6️⃣ Testing storage bucket access...');
    const testFileName = `avatars/${testUser.id}/test-${Date.now()}.txt`;
    const testContent = new Blob(['Test content'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testFileName, testContent, {
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError.message);
      console.log('   Error details:', uploadError);
      console.log('\n   Possible causes:');
      console.log('   - user-content bucket does not exist');
      console.log('   - Storage policies are missing or incorrect');
      console.log('   - Bucket is not public');
    } else {
      console.log('✅ Storage upload successful');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(testFileName);
      
      console.log('   Public URL:', urlData.publicUrl);
      
      // Clean up
      await supabase.storage
        .from('user-content')
        .remove([testFileName]);
    }

    // 7. Check user metadata
    console.log('\n7️⃣ Checking user metadata...');
    console.log('   User metadata:', testUser.user_metadata);
    console.log('   App metadata:', testUser.app_metadata);
    
    if (testUser.user_metadata?.avatar_url) {
      console.log('\n   ⚠️  Note: avatar_url in user_metadata is separate from profiles.avatar_url');
      console.log('   Make sure both are updated when changing avatar');
    }

    // 8. Summary
    console.log('\n📊 Test Summary:');
    console.log('────────────────');
    console.log('\nIf any operations failed, check:');
    console.log('1. RLS is enabled on profiles table');
    console.log('2. Correct policies exist (see check-rls-and-storage-policies.js output)');
    console.log('3. Storage bucket "user-content" exists and is public');
    console.log('4. Storage policies allow authenticated users to upload/update/delete');
    console.log('\nRun the fix SQL files to resolve issues.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testProfileOperations();