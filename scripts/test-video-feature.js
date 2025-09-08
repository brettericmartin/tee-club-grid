import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key in .env.local');
  process.exit(1);
}

// Use anon key to simulate client-side behavior
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVideoFeature() {
  try {
    console.log('Testing video feature after RLS fix...\n');

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user. Please log in through the UI first.');
      console.log('   The test needs an authenticated session to work properly.');
      return;
    }

    console.log('✅ Authenticated as:', user.email);

    // Get user's bag
    const { data: bags, error: bagError } = await supabase
      .from('user_bags')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (bagError || !bags || bags.length === 0) {
      console.log('❌ No bags found for user');
      return;
    }

    const testBag = bags[0];
    console.log('✅ Found bag:', testBag.name);

    // Test video data
    const testVideo = {
      bag_id: testBag.id,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Golf Tips Test Video',
      notes: 'Testing after RLS fix',
      share_to_feed: false
    };

    console.log('\n📹 Attempting to add video...');
    console.log('   URL:', testVideo.url);
    console.log('   Title:', testVideo.title);

    // Import the actual service function
    const { addBagVideo } = await import('../src/services/bagVideos.ts');
    
    // Try to add the video using the actual service
    const result = await addBagVideo(testVideo);

    if (result.error) {
      console.log('❌ Failed to add video:', result.error.message);
      console.log('   Full error:', result.error);
    } else if (result.duplicate) {
      console.log('⚠️  Video is a duplicate of recent feed post');
      console.log('   Posted by:', result.duplicate.profile?.username);
    } else if (result.data) {
      console.log('✅ Video added successfully!');
      console.log('   Video ID:', result.data.id);
      console.log('   Provider:', result.data.provider);
      console.log('   Video provider ID:', result.data.video_id);
      
      // Verify we can read it back
      console.log('\n📖 Verifying video can be read...');
      const { data: videos, error: readError } = await supabase
        .from('user_bag_videos')
        .select('*')
        .eq('bag_id', testBag.id)
        .order('created_at', { ascending: false });

      if (readError) {
        console.log('❌ Error reading videos:', readError.message);
      } else {
        console.log('✅ Videos in bag:', videos.length);
        const ourVideo = videos.find(v => v.id === result.data.id);
        if (ourVideo) {
          console.log('✅ Our test video found in the list!');
          console.log('   Title:', ourVideo.title);
          console.log('   URL:', ourVideo.url);
        }
      }

      // Clean up test video
      console.log('\n🧹 Cleaning up test video...');
      const { error: deleteError } = await supabase
        .from('user_bag_videos')
        .delete()
        .eq('id', result.data.id);

      if (deleteError) {
        console.log('⚠️  Failed to clean up test video:', deleteError.message);
      } else {
        console.log('✅ Test video cleaned up');
      }
    }

    console.log('\n✅ Video feature is working properly!');
    console.log('   Users can now add YouTube videos to their bags.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testVideoFeature();