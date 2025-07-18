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

async function debugStorageAndProfiles() {
  console.log('🔍 Debugging Storage and Profiles...\n');

  try {
    // 1. Get current user
    console.log('1️⃣ Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user found. Please sign in first.');
      return;
    }

    console.log('✅ Current user:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    });

    // 2. Check profile data
    console.log('\n2️⃣ Checking profile data...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('✅ Profile data:', profile);
    }

    // 3. List files in user-content bucket
    console.log('\n3️⃣ Listing files in user-content bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('user-content')
      .list('avatars', {
        limit: 100,
        offset: 0
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
    } else {
      console.log(`✅ Found ${files?.length || 0} files in avatars folder:`);
      files?.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`);
        
        // Get public URL for each file
        const { data: urlData } = supabase.storage
          .from('user-content')
          .getPublicUrl(`avatars/${file.name}`);
        
        console.log(`     URL: ${urlData.publicUrl}`);
      });
    }

    // 4. Check if profile avatar_url is accessible
    if (profile?.avatar_url) {
      console.log('\n4️⃣ Checking if profile avatar URL is accessible...');
      console.log(`   Avatar URL: ${profile.avatar_url}`);
      
      try {
        const response = await fetch(profile.avatar_url);
        if (response.ok) {
          console.log('   ✅ Avatar URL is accessible (HTTP', response.status, ')');
        } else {
          console.log('   ❌ Avatar URL returned HTTP', response.status);
        }
      } catch (error) {
        console.log('   ❌ Failed to fetch avatar URL:', error.message);
      }
    }

    // 5. Test creating a new file
    console.log('\n5️⃣ Testing file upload...');
    const testFileName = `avatars/test-${user.id}-${Date.now()}.txt`;
    const testContent = 'Test content';
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Test file uploaded successfully');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(testFileName);
      
      console.log('   Public URL:', urlData.publicUrl);
      
      // Clean up
      await supabase.storage
        .from('user-content')
        .remove([testFileName]);
      console.log('   ✅ Test file cleaned up');
    }

    // 6. Check bucket configuration
    console.log('\n6️⃣ Bucket configuration:');
    console.log('   Bucket name: user-content');
    console.log('   Expected path format: avatars/${userId}-${timestamp}.${ext}');
    console.log('   Public bucket: Yes (should be accessible without auth)');

    // 7. Suggestions
    console.log('\n💡 Debugging suggestions:');
    console.log('1. If avatar_url is set but not showing:');
    console.log('   - Check browser console for 404 errors');
    console.log('   - Verify the URL is publicly accessible');
    console.log('   - Check if user_metadata needs updating');
    console.log('\n2. If uploads succeed but avatar_url is null:');
    console.log('   - Check if updateProfile is being called after upload');
    console.log('   - Verify the profile update includes avatar_url');
    console.log('\n3. If files exist in storage but wrong URLs:');
    console.log('   - Check the path structure matches what\'s expected');
    console.log('   - Verify public URL generation');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run with current session
console.log('📝 Make sure you are signed in to the app before running this script.');
console.log('   The script will use your current browser session.\n');

debugStorageAndProfiles();