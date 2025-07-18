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

async function debugAvatarDisplay() {
  console.log('🔍 Debugging Avatar Display Issue');
  console.log('=================================\n');

  try {
    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user found. Please sign in first.');
      return;
    }

    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);

    // 2. Check profile data
    console.log('\n📋 Profile Data:');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('   Display Name:', profile.display_name);
    console.log('   Avatar URL:', profile.avatar_url || '(not set)');
    
    // 3. If avatar_url exists, check if it's accessible
    if (profile.avatar_url) {
      console.log('\n🖼️  Avatar URL Analysis:');
      console.log('   Full URL:', profile.avatar_url);
      
      // Parse the URL
      try {
        const url = new URL(profile.avatar_url);
        console.log('   Host:', url.host);
        console.log('   Path:', url.pathname);
        
        // Check if it's pointing to the correct Supabase project
        if (!profile.avatar_url.includes(supabaseUrl.replace('https://', ''))) {
          console.log('   ⚠️  WARNING: Avatar URL doesn\'t match current Supabase project!');
          console.log('   Expected host:', supabaseUrl);
        }
      } catch (e) {
        console.log('   ❌ Invalid URL format');
      }
      
      // Test if URL is accessible
      console.log('\n🌐 Testing URL accessibility:');
      try {
        const response = await fetch(profile.avatar_url);
        console.log('   HTTP Status:', response.status);
        console.log('   Content-Type:', response.headers.get('content-type'));
        
        if (response.status === 200) {
          console.log('   ✅ Avatar URL is accessible');
        } else if (response.status === 404) {
          console.log('   ❌ Avatar file not found (404)');
        } else if (response.status === 403) {
          console.log('   ❌ Access forbidden (403) - Check storage policies');
        } else {
          console.log('   ❌ Unexpected status:', response.status);
        }
      } catch (error) {
        console.log('   ❌ Failed to fetch avatar:', error.message);
      }
    }

    // 4. List actual files in storage
    console.log('\n📁 Files in Storage:');
    const { data: files, error: listError } = await supabase.storage
      .from('user-content')
      .list(`avatars/${user.id}`, {
        limit: 10,
        offset: 0
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
    } else if (files && files.length > 0) {
      console.log(`   Found ${files.length} files:`);
      files.forEach(file => {
        const publicUrl = supabase.storage
          .from('user-content')
          .getPublicUrl(`avatars/${user.id}/${file.name}`);
        
        console.log(`\n   📄 ${file.name}`);
        console.log(`      Size: ${(file.metadata?.size || 0) / 1024} KB`);
        console.log(`      Created: ${file.created_at}`);
        console.log(`      Public URL: ${publicUrl.data.publicUrl}`);
        
        // Check if this matches the profile avatar_url
        if (profile.avatar_url && publicUrl.data.publicUrl === profile.avatar_url) {
          console.log('      ✅ This matches the profile avatar_url');
        }
      });
    } else {
      console.log('   No files found in avatars folder');
    }

    // 5. Generate correct public URL
    if (files && files.length > 0) {
      const latestFile = files[files.length - 1];
      const correctUrl = supabase.storage
        .from('user-content')
        .getPublicUrl(`avatars/${user.id}/${latestFile.name}`);
      
      console.log('\n💡 Correct Avatar URL should be:');
      console.log('   ', correctUrl.data.publicUrl);
      
      if (profile.avatar_url !== correctUrl.data.publicUrl) {
        console.log('\n⚠️  Profile avatar_url doesn\'t match the actual file URL!');
        console.log('   This might be why the avatar isn\'t displaying.');
      }
    }

    // 6. Check bucket configuration
    console.log('\n🪣 Storage Bucket Status:');
    const { data: buckets } = await supabase.storage.listBuckets();
    const userContentBucket = buckets?.find(b => b.name === 'user-content');
    
    if (userContentBucket) {
      console.log('   Bucket exists:', userContentBucket.name);
      console.log('   Public:', userContentBucket.public ? '✅ Yes' : '❌ No');
      if (!userContentBucket.public) {
        console.log('   ⚠️  Bucket is not public! Avatars won\'t display.');
      }
    }

    // 7. Recommendations
    console.log('\n📌 Troubleshooting Steps:');
    console.log('1. Check browser console for 404 or 403 errors');
    console.log('2. Verify the avatar_url in the database matches the actual file');
    console.log('3. Ensure the storage bucket is PUBLIC');
    console.log('4. Check if the URL is using the correct Supabase project');
    console.log('5. Try updating the profile with a fresh avatar upload');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the debugger
debugAvatarDisplay();