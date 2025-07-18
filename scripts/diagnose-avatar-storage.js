import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Make sure you have VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseAvatarStorage() {
  console.log('🔍 Diagnosing Avatar Storage Issues\n');

  try {
    // 1. Check if user-content bucket exists
    console.log('1️⃣ Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return;
    }

    const userContentBucket = buckets.find(b => b.name === 'user-content');
    if (!userContentBucket) {
      console.error('❌ user-content bucket not found!');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ user-content bucket exists');
    console.log('   Public:', userContentBucket.public);
    console.log('   Created:', userContentBucket.created_at);

    // 2. List files in avatars folder
    console.log('\n2️⃣ Listing files in avatars folder...');
    const { data: files, error: filesError } = await supabase.storage
      .from('user-content')
      .list('avatars', {
        limit: 100,
        offset: 0
      });

    if (filesError) {
      console.error('❌ Error listing files:', filesError.message);
    } else if (!files || files.length === 0) {
      console.log('⚠️ No files found in avatars folder');
    } else {
      console.log(`✅ Found ${files.length} files in avatars folder:`);
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`);
      });
    }

    // 3. Get profiles with avatars
    console.log('\n3️⃣ Checking profiles with avatar_url...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .not('avatar_url', 'is', null)
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No profiles have avatar_url set');
      return;
    }

    console.log(`✅ Found ${profiles.length} profiles with avatars`);

    // 4. Test downloading each avatar
    console.log('\n4️⃣ Testing avatar downloads...');
    for (const profile of profiles) {
      console.log(`\n📸 Testing avatar for ${profile.username}:`);
      console.log(`   URL: ${profile.avatar_url}`);

      // Extract file path from URL
      const url = new URL(profile.avatar_url);
      const pathMatch = url.pathname.match(/user-content\/(.+)$/);
      
      if (!pathMatch) {
        console.error('   ❌ Could not extract file path from URL');
        continue;
      }

      const filePath = pathMatch[1];
      console.log(`   File path: ${filePath}`);

      // Try to download the file
      const { data, error } = await supabase.storage
        .from('user-content')
        .download(filePath);

      if (error) {
        console.error(`   ❌ Download error: ${error.message}`);
        
        // Try with public URL
        const publicUrl = supabase.storage
          .from('user-content')
          .getPublicUrl(filePath);
        
        console.log(`   Public URL: ${publicUrl.data.publicUrl}`);
        
        // Try to fetch the public URL
        try {
          const response = await fetch(publicUrl.data.publicUrl);
          console.log(`   Fetch status: ${response.status} ${response.statusText}`);
          console.log(`   Content-Type: ${response.headers.get('content-type')}`);
          
          if (response.headers.get('content-type')?.includes('text/html')) {
            const text = await response.text();
            console.log('   ❌ Received HTML error page:');
            console.log('   ', text.substring(0, 200) + '...');
          }
        } catch (fetchError) {
          console.error(`   ❌ Fetch error: ${fetchError.message}`);
        }
      } else {
        console.log(`   ✅ Download successful!`);
        console.log(`   File size: ${data.size} bytes`);
        console.log(`   File type: ${data.type}`);
        
        // Check if it's HTML
        if (data.type.includes('text/html')) {
          const text = await data.text();
          console.log('   ❌ File contains HTML:');
          console.log('   ', text.substring(0, 200) + '...');
        }
      }

      // Try creating a signed URL
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('user-content')
        .createSignedUrl(filePath, 60);

      if (signedError) {
        console.error(`   ❌ Signed URL error: ${signedError.message}`);
      } else {
        console.log(`   📝 Signed URL created successfully`);
      }
    }

    // 5. Test uploading a new file
    console.log('\n5️⃣ Testing file upload...');
    const testFileName = `avatars/test-${Date.now()}.txt`;
    const testContent = 'This is a test file for avatar storage diagnosis';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }));

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
    } else {
      console.log('✅ Upload test successful');
      console.log('   Path:', uploadData.path);
      
      // Try to download it back
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user-content')
        .download(testFileName);
      
      if (downloadError) {
        console.error('   ❌ Could not download test file:', downloadError.message);
      } else {
        const content = await downloadData.text();
        console.log('   ✅ Download successful, content matches:', content === testContent);
      }
      
      // Clean up
      await supabase.storage
        .from('user-content')
        .remove([testFileName]);
    }

    // 6. Check storage policies
    console.log('\n6️⃣ Checking storage policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { schema_name: 'storage', table_name: 'objects' });

    if (!policiesError && policies) {
      const userContentPolicies = policies.filter(p => 
        p.definition?.includes('user-content') || 
        p.definition?.includes('bucket_id')
      );
      
      console.log(`Found ${userContentPolicies.length} policies related to storage`);
      userContentPolicies.forEach(policy => {
        console.log(`   - ${policy.policyname}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run the diagnosis
diagnoseAvatarStorage();