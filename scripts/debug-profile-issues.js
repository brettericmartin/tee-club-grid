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

async function debugProfileIssues() {
  console.log('🔍 Debugging Profile Issues...\n');
  console.log('📌 Supabase URL:', supabaseUrl);
  console.log('📌 Time:', new Date().toLocaleString());
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // 1. Get current user
    console.log('1️⃣ Authentication Check');
    console.log('-'.repeat(40));
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user found.');
      console.log('📝 Please sign in to the app first, then run this script.');
      return;
    }

    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);
    console.log('   Metadata:', JSON.stringify(user.user_metadata, null, 2));

    // 2. Check profile data
    console.log('\n2️⃣ Profile Data Check');
    console.log('-'.repeat(40));
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  No profile exists for this user');
        console.log('   This is normal for new users - profile will be created on first edit');
      } else {
        console.error('❌ Error fetching profile:', profileError);
      }
    } else {
      console.log('✅ Profile found:');
      console.log('   Username:', profile.username || '(not set)');
      console.log('   Display Name:', profile.display_name || '(not set)');
      console.log('   Avatar URL:', profile.avatar_url || '(not set)');
      console.log('   Handicap:', profile.handicap || '(not set)');
      console.log('   Created:', profile.created_at);
      console.log('   Updated:', profile.updated_at);
    }

    // 3. Check storage bucket
    console.log('\n3️⃣ Storage Bucket Check');
    console.log('-'.repeat(40));
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
    } else {
      const userContentBucket = buckets?.find(b => b.name === 'user-content');
      if (userContentBucket) {
        console.log('✅ user-content bucket exists');
        console.log('   Public:', userContentBucket.public ? 'Yes ✅' : 'No ❌');
        console.log('   Created:', userContentBucket.created_at);
      } else {
        console.log('❌ user-content bucket not found');
      }
    }

    // 4. List avatar files
    console.log('\n4️⃣ Avatar Files Check');
    console.log('-'.repeat(40));
    const { data: files, error: listError } = await supabase.storage
      .from('user-content')
      .list(`avatars/${user.id}`, {
        limit: 100,
        offset: 0
      });

    if (listError) {
      console.error('❌ Error listing avatar files:', listError);
      console.log('   This might mean the storage policies are not configured correctly');
    } else {
      console.log(`✅ Found ${files?.length || 0} avatar files for this user:`);
      files?.forEach(file => {
        console.log(`   📸 ${file.name}`);
        console.log(`      Size: ${(file.metadata?.size || 0) / 1024} KB`);
        console.log(`      Created: ${file.created_at}`);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('user-content')
          .getPublicUrl(`avatars/${user.id}/${file.name}`);
        
        console.log(`      URL: ${urlData.publicUrl}`);
      });
    }

    // 5. Test avatar URL accessibility
    if (profile?.avatar_url) {
      console.log('\n5️⃣ Avatar URL Accessibility Test');
      console.log('-'.repeat(40));
      console.log('Testing URL:', profile.avatar_url);
      
      try {
        const response = await fetch(profile.avatar_url);
        if (response.ok) {
          console.log('✅ Avatar URL is accessible (HTTP', response.status, ')');
          console.log('   Content-Type:', response.headers.get('content-type'));
          console.log('   Content-Length:', response.headers.get('content-length'), 'bytes');
        } else {
          console.log('❌ Avatar URL returned HTTP', response.status);
          console.log('   This means the file exists but may have permission issues');
        }
      } catch (error) {
        console.log('❌ Failed to fetch avatar URL:', error.message);
        console.log('   This could indicate network issues or CORS problems');
      }
    }

    // 6. Test upload capability
    console.log('\n6️⃣ Upload Capability Test');
    console.log('-'.repeat(40));
    const testFileName = `avatars/${user.id}/test-${Date.now()}.txt`;
    const testContent = new Blob(['Test upload at ' + new Date().toISOString()], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      console.log('   This indicates storage permission issues');
    } else {
      console.log('✅ Test file uploaded successfully');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(testFileName);
      
      console.log('   Public URL:', urlData.publicUrl);
      
      // Test accessibility
      try {
        const response = await fetch(urlData.publicUrl);
        if (response.ok) {
          console.log('   ✅ Test file is publicly accessible');
        } else {
          console.log('   ❌ Test file is not publicly accessible (HTTP', response.status, ')');
        }
      } catch (error) {
        console.log('   ❌ Failed to access test file:', error.message);
      }
      
      // Clean up
      const { error: deleteError } = await supabase.storage
        .from('user-content')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('   ✅ Test file cleaned up');
      }
    }

    // 7. Recommendations
    console.log('\n7️⃣ Recommendations');
    console.log('-'.repeat(40));
    
    if (!profile) {
      console.log('📌 No profile exists - this will be created when user first edits profile');
    }
    
    if (profile && !profile.display_name) {
      console.log('📌 No display name set - user should update their profile');
    }
    
    if (profile?.avatar_url) {
      const isAccessible = await fetch(profile.avatar_url).then(r => r.ok).catch(() => false);
      if (!isAccessible) {
        console.log('📌 Avatar URL is not accessible - run the storage policy SQL script');
      }
    }
    
    console.log('\n✅ Debug complete!');
    console.log('\nNext steps:');
    console.log('1. If storage policies are missing, run: sql/fix-avatar-storage-policies.sql');
    console.log('2. If profile is missing display_name, user should edit their profile');
    console.log('3. If avatar upload fails, check storage bucket permissions');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Instructions
console.log('📝 Profile Issue Debugger');
console.log('========================\n');
console.log('This script will help diagnose profile and avatar issues.\n');
console.log('Prerequisites:');
console.log('1. Make sure you are signed in to the app');
console.log('2. Keep the browser tab open (for auth session)');
console.log('3. Run this script: node scripts/debug-profile-issues.js\n');

// Run the debugger
debugProfileIssues();