import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageStructure() {
  console.log('🔍 Testing Storage Structure and Policies\n');

  // First, let's authenticate
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    console.log('❌ Not authenticated. Please sign in first.');
    return;
  }

  console.log('✅ Authenticated as:', session.user.email);
  console.log('   User ID:', session.user.id);

  try {
    // Test 1: Simple file upload to root
    console.log('\n1️⃣ Testing upload to root of user-content...');
    const rootFile = new Blob(['test'], { type: 'text/plain' });
    const rootPath = `test-root-${Date.now()}.txt`;
    
    const { error: rootError } = await supabase.storage
      .from('user-content')
      .upload(rootPath, rootFile);
    
    if (rootError) {
      console.log('❌ Root upload failed:', rootError.message);
    } else {
      console.log('✅ Root upload succeeded');
      // Clean up
      await supabase.storage.from('user-content').remove([rootPath]);
    }

    // Test 2: Upload to avatars folder
    console.log('\n2️⃣ Testing upload to avatars folder...');
    const avatarFile = new Blob(['test avatar'], { type: 'text/plain' });
    const avatarPath = `avatars/test-${Date.now()}.txt`;
    
    const { data: avatarData, error: avatarError } = await supabase.storage
      .from('user-content')
      .upload(avatarPath, avatarFile);
    
    if (avatarError) {
      console.log('❌ Avatar folder upload failed:', avatarError.message);
      console.log('   Error details:', avatarError);
    } else {
      console.log('✅ Avatar folder upload succeeded');
      console.log('   Path:', avatarData.path);
      // Clean up
      await supabase.storage.from('user-content').remove([avatarPath]);
    }

    // Test 3: Upload to user-specific avatar folder
    console.log('\n3️⃣ Testing upload to user-specific avatar folder...');
    const userAvatarFile = new Blob(['test user avatar'], { type: 'text/plain' });
    const userAvatarPath = `avatars/${session.user.id}/test-${Date.now()}.txt`;
    
    const { data: userAvatarData, error: userAvatarError } = await supabase.storage
      .from('user-content')
      .upload(userAvatarPath, userAvatarFile);
    
    if (userAvatarError) {
      console.log('❌ User avatar folder upload failed:', userAvatarError.message);
      console.log('   Error details:', userAvatarError);
    } else {
      console.log('✅ User avatar folder upload succeeded');
      console.log('   Path:', userAvatarData.path);
      // Clean up
      await supabase.storage.from('user-content').remove([userAvatarPath]);
    }

    // Test 4: Test with actual image
    console.log('\n4️⃣ Testing with actual image data...');
    // Create a tiny 1x1 red pixel PNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBlob = new Blob([bytes], { type: 'image/png' });
    
    const imagePath = `avatars/${session.user.id}/${Date.now()}.png`;
    
    console.log('   Blob size:', imageBlob.size, 'bytes');
    console.log('   Blob type:', imageBlob.type);
    console.log('   Upload path:', imagePath);
    
    const { data: imageData, error: imageError } = await supabase.storage
      .from('user-content')
      .upload(imagePath, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
    
    if (imageError) {
      console.log('❌ Image upload failed:', imageError.message);
      console.log('   Error details:', imageError);
    } else {
      console.log('✅ Image upload succeeded!');
      console.log('   Path:', imageData.path);
      console.log('   ID:', imageData.id);
      
      // Test download
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user-content')
        .download(imagePath);
      
      if (downloadError) {
        console.log('   ❌ Download failed:', downloadError.message);
      } else {
        console.log('   ✅ Download succeeded, size:', downloadData.size, 'bytes');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-content')
        .getPublicUrl(imagePath);
      
      console.log('   Public URL:', publicUrl);
      
      // Don't clean up - keep this for testing
      console.log('   ⚠️  Keeping this file for manual inspection');
    }

    // Test 5: Check folder structure
    console.log('\n5️⃣ Checking folder structure...');
    const { data: folderList, error: folderError } = await supabase.storage
      .from('user-content')
      .list('avatars', {
        limit: 10,
        offset: 0
      });
    
    if (folderError) {
      console.log('❌ Could not list avatars folder:', folderError.message);
    } else {
      console.log('✅ Avatars folder contents:');
      if (folderList && folderList.length > 0) {
        folderList.forEach(item => {
          console.log(`   - ${item.name} (${item.metadata?.size || 0} bytes)`);
        });
      } else {
        console.log('   (empty)');
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the test
testStorageStructure();