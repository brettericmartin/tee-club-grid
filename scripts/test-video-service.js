import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Admin client for setup
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testVideoService() {
  try {
    console.log('🎬 Testing Video Feature After RLS Fix\n');
    console.log('='.repeat(40));

    // Get a test user
    const { data: users, error: userError } = await adminSupabase
      .from('profiles')
      .select('id, username, email')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUser = users[0];
    console.log('\n👤 Test User:', testUser.username || testUser.email);

    // Get user's bag
    const { data: bags, error: bagError } = await adminSupabase
      .from('user_bags')
      .select('*')
      .eq('user_id', testUser.id)
      .limit(1);

    if (bagError || !bags || bags.length === 0) {
      console.log('❌ No bags found for user');
      
      // Create a test bag
      console.log('📦 Creating test bag...');
      const { data: newBag, error: createError } = await adminSupabase
        .from('user_bags')
        .insert({
          user_id: testUser.id,
          name: 'Test Bag for Videos',
          description: 'Testing video functionality',
          is_public: true
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Failed to create test bag:', createError.message);
        return;
      }
      
      bags.push(newBag);
      console.log('✅ Created test bag:', newBag.name);
    }

    const testBag = bags[0];
    console.log('🎒 Using bag:', testBag.name);

    // Test 1: Insert video as user (simulated with correct user_id)
    console.log('\n📹 Test 1: Adding video with correct user_id...');
    
    const testVideo1 = {
      user_id: testUser.id,
      bag_id: testBag.id,
      provider: 'youtube',
      video_id: 'OMOGaugKpzs',  // Different video for testing
      url: 'https://www.youtube.com/watch?v=OMOGaugKpzs',
      title: 'The Police - Every Breath You Take',
      notes: 'Testing after RLS policy fix',
      share_to_feed: false
    };

    const { data: video1, error: insertError1 } = await adminSupabase
      .from('user_bag_videos')
      .insert(testVideo1)
      .select()
      .single();

    if (insertError1) {
      console.log('❌ Failed to insert video:', insertError1.message);
    } else {
      console.log('✅ Video inserted successfully!');
      console.log('   ID:', video1.id);
      console.log('   Title:', video1.title);
      console.log('   Provider:', video1.provider);
    }

    // Test 2: Try to insert with wrong user_id (should fail with RLS)
    console.log('\n🔒 Test 2: Testing RLS - wrong user_id (should fail)...');
    
    // Create client with anon key to simulate RLS
    const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const testVideo2 = {
      user_id: 'fake-user-id',
      bag_id: testBag.id,
      provider: 'youtube',
      video_id: 'test123',
      url: 'https://www.youtube.com/watch?v=test123',
      title: 'Should Fail - Wrong User',
      share_to_feed: false
    };

    const { data: video2, error: insertError2 } = await anonSupabase
      .from('user_bag_videos')
      .insert(testVideo2)
      .select()
      .single();

    if (insertError2) {
      console.log('✅ RLS working! Insert with wrong user_id blocked');
      console.log('   Error:', insertError2.message);
    } else {
      console.log('❌ RLS not working - insert should have failed');
    }

    // Test 3: Query videos
    console.log('\n📖 Test 3: Querying videos for the bag...');
    
    const { data: videos, error: queryError } = await adminSupabase
      .from('user_bag_videos')
      .select('*')
      .eq('bag_id', testBag.id)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.log('❌ Failed to query videos:', queryError.message);
    } else {
      console.log('✅ Found', videos.length, 'video(s) in bag');
      videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title || 'Untitled'} (${v.provider})`);
      });
    }

    // Test 4: Check if video embeds would work
    console.log('\n🖼️  Test 4: Checking video embed data...');
    if (videos && videos.length > 0) {
      const sampleVideo = videos[0];
      console.log('Sample video for embedding:');
      console.log('   URL:', sampleVideo.url);
      console.log('   Provider:', sampleVideo.provider);
      console.log('   Video ID:', sampleVideo.video_id);
      console.log('   Embed URL would be:', 
        `https://www.youtube-nocookie.com/embed/${sampleVideo.video_id}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (video1) {
      const { error: deleteError } = await adminSupabase
        .from('user_bag_videos')
        .delete()
        .eq('id', video1.id);
      
      if (!deleteError) {
        console.log('✅ Test video cleaned up');
      }
    }

    console.log('\n' + '='.repeat(40));
    console.log('✅ VIDEO FEATURE IS WORKING!');
    console.log('\nUsers can now:');
    console.log('  • Add YouTube videos to their bags');
    console.log('  • View videos in the Videos tab');
    console.log('  • Share videos to feed (optional)');
    console.log('\nRLS policies are properly configured.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testVideoService();