import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.error('Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyStoragePublic() {
  console.log('🔍 Verifying Storage Bucket Configuration\n');

  try {
    // Get a profile with an avatar
    console.log('1️⃣ Finding a profile with avatar...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .not('avatar_url', 'is', null)
      .limit(1)
      .single();

    if (profileError || !profile) {
      console.log('❌ No profiles with avatars found');
      return;
    }

    console.log('✅ Found profile:', profile.username);
    console.log('   Avatar URL:', profile.avatar_url);

    // Test if the URL is publicly accessible
    console.log('\n2️⃣ Testing public access...');
    try {
      const response = await fetch(profile.avatar_url);
      console.log('   Status:', response.status, response.statusText);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          console.log('✅ Avatar is publicly accessible!');
        } else {
          console.log('❌ URL returned non-image content:', contentType);
        }
      } else {
        console.log('❌ Avatar is not publicly accessible');
      }
    } catch (fetchError) {
      console.log('❌ Failed to fetch avatar:', fetchError.message);
    }

    // Generate a fresh public URL to test
    console.log('\n3️⃣ Generating fresh public URL...');
    try {
      const url = new URL(profile.avatar_url);
      const pathMatch = url.pathname.match(/user-content\/(.+)$/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        const { data } = supabase.storage
          .from('user-content')
          .getPublicUrl(filePath);
        
        console.log('   Fresh URL:', data.publicUrl);
        
        // Test the fresh URL
        const freshResponse = await fetch(data.publicUrl);
        console.log('   Fresh URL Status:', freshResponse.status);
        
        if (freshResponse.status === 200) {
          console.log('✅ Fresh public URL works!');
        } else {
          console.log('❌ Fresh public URL failed');
        }
      }
    } catch (e) {
      console.error('❌ Error generating fresh URL:', e.message);
    }

    console.log('\n📋 Summary:');
    console.log('If avatars are not displaying, ensure:');
    console.log('1. The user-content bucket is set to PUBLIC in Supabase dashboard');
    console.log('2. RLS policies allow SELECT on storage.objects');
    console.log('3. The bucket has proper CORS configuration');
    console.log('4. Files are uploaded to the correct path (avatars/user_id/filename)');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run the verification
verifyStoragePublic();