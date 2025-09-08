import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testVideoAdd() {
  try {
    console.log('Testing video add functionality...\n');

    // Get a test user
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('❌ No users found to test with');
      return;
    }

    const testUser = users[0];
    console.log('✅ Found test user:', testUser.username);

    // Get a test bag for this user
    const { data: bags, error: bagError } = await supabase
      .from('user_bags')
      .select('id, name')
      .eq('user_id', testUser.id)
      .limit(1);

    if (bagError || !bags || bags.length === 0) {
      console.log('❌ No bags found for user');
      
      // Create a test bag
      console.log('Creating test bag...');
      const { data: newBag, error: createError } = await supabase
        .from('user_bags')
        .insert({
          user_id: testUser.id,
          name: 'Test Bag for Videos',
          description: 'Testing video functionality'
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Failed to create test bag:', createError.message);
        return;
      }
      
      console.log('✅ Created test bag:', newBag.name);
      bags.push(newBag);
    }

    const testBag = bags[0];
    console.log('✅ Using bag:', testBag.name);

    // Test adding a video
    const testVideo = {
      user_id: testUser.id,
      bag_id: testBag.id,
      provider: 'youtube',
      video_id: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video - Golf Tips',
      share_to_feed: false
    };

    console.log('\nInserting test video...');
    const { data: video, error: videoError } = await supabase
      .from('user_bag_videos')
      .insert(testVideo)
      .select()
      .single();

    if (videoError) {
      console.log('❌ Failed to insert video:', videoError.message);
      console.log('   Error details:', videoError);
    } else {
      console.log('✅ Video inserted successfully!');
      console.log('   Video ID:', video.id);
      console.log('   Title:', video.title);
      console.log('   Provider:', video.provider);
      console.log('   Video ID:', video.video_id);

      // Clean up test video
      console.log('\nCleaning up test video...');
      const { error: deleteError } = await supabase
        .from('user_bag_videos')
        .delete()
        .eq('id', video.id);

      if (deleteError) {
        console.log('⚠️  Failed to clean up test video:', deleteError.message);
      } else {
        console.log('✅ Test video cleaned up');
      }
    }

    // Check if we can query videos
    console.log('\nQuerying videos for bag...');
    const { data: videos, error: queryError, count } = await supabase
      .from('user_bag_videos')
      .select('*', { count: 'exact' })
      .eq('bag_id', testBag.id);

    if (queryError) {
      console.log('❌ Failed to query videos:', queryError.message);
    } else {
      console.log('✅ Query successful. Videos in bag:', count || 0);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testVideoAdd();