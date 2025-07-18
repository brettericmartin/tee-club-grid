import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

async function testAvatarUpload() {
  console.log('🔍 Testing Avatar Upload Process\n');

  try {
    // 1. Create a test file
    console.log('1️⃣ Creating test file...');
    const testContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const testFile = new Blob([testContent], { type: 'image/png' });
    console.log('✅ Test file created, size:', testFile.size, 'bytes');

    // 2. Test upload with explicit data return
    console.log('\n2️⃣ Testing upload with data return...');
    const fileName = `test-${Date.now()}.png`;
    const filePath = `avatars/test-user/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }

    console.log('✅ Upload response:', uploadData);
    console.log('   Path:', uploadData?.path);
    console.log('   ID:', uploadData?.id);
    console.log('   Full path:', uploadData?.fullPath);

    // 3. Verify file exists
    console.log('\n3️⃣ Verifying file exists...');
    const { data: listData, error: listError } = await supabase.storage
      .from('user-content')
      .list('avatars/test-user', {
        limit: 10,
        offset: 0
      });

    if (listError) {
      console.error('❌ List error:', listError);
    } else {
      const uploadedFile = listData?.find(f => f.name === fileName);
      if (uploadedFile) {
        console.log('✅ File found in storage!');
        console.log('   Name:', uploadedFile.name);
        console.log('   Size:', uploadedFile.metadata?.size, 'bytes');
        console.log('   MIME type:', uploadedFile.metadata?.mimetype);
      } else {
        console.log('❌ File not found in storage listing');
      }
    }

    // 4. Try to download the file
    console.log('\n4️⃣ Testing download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('user-content')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Download error:', downloadError);
    } else {
      console.log('✅ Download successful!');
      console.log('   Downloaded size:', downloadData.size, 'bytes');
      console.log('   Downloaded type:', downloadData.type);
    }

    // 5. Get public URL and test
    console.log('\n5️⃣ Testing public URL...');
    const { data: urlData } = supabase.storage
      .from('user-content')
      .getPublicUrl(filePath);
    
    console.log('   Public URL:', urlData.publicUrl);
    
    try {
      const response = await fetch(urlData.publicUrl);
      console.log('   Fetch status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      if (response.status === 200) {
        const buffer = await response.arrayBuffer();
        console.log('   Response size:', buffer.byteLength, 'bytes');
      }
    } catch (e) {
      console.error('   Fetch error:', e.message);
    }

    // 6. Clean up
    console.log('\n6️⃣ Cleaning up test file...');
    const { error: removeError } = await supabase.storage
      .from('user-content')
      .remove([filePath]);
    
    if (removeError) {
      console.error('❌ Remove error:', removeError);
    } else {
      console.log('✅ Test file removed');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the test
testAvatarUpload();