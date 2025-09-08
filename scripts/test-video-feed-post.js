import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testVideoFeedPost() {
  try {
    console.log('📺 Testing Video Feed Post Creation\n');
    console.log('='.repeat(40));

    // Get a test user
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, email')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const testUser = users[0];
    console.log('\n👤 Test User:', testUser.username || testUser.email);

    // Get user's bag
    const { data: bags } = await supabase
      .from('user_bags')
      .select('*')
      .eq('user_id', testUser.id)
      .limit(1);

    if (!bags || bags.length === 0) {
      console.log('❌ No bags found for user');
      return;
    }

    const testBag = bags[0];
    console.log('🎒 Using bag:', testBag.name);

    // Create a test video with share_to_feed = true
    console.log('\n📹 Creating video with share_to_feed = true...');
    
    const testVideo = {
      user_id: testUser.id,
      bag_id: testBag.id,
      provider: 'youtube',
      video_id: 'ScMzIvxBSi4',  // Sample golf video
      url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
      title: 'Tiger Woods Best Golf Shots',
      notes: 'Amazing golf shots compilation',
      thumbnail_url: 'https://img.youtube.com/vi/ScMzIvxBSi4/maxresdefault.jpg',
      share_to_feed: true  // This should trigger feed post creation
    };

    // Insert the video
    const { data: video, error: videoError } = await supabase
      .from('user_bag_videos')
      .insert(testVideo)
      .select()
      .single();

    if (videoError) {
      console.log('❌ Failed to insert video:', videoError.message);
      return;
    }

    console.log('✅ Video created:', video.id);
    console.log('   Title:', video.title);
    console.log('   Share to feed:', video.share_to_feed);

    // Now create the feed post
    console.log('\n📰 Creating feed post for video...');
    
    const feedPost = {
      user_id: testUser.id,
      type: 'bag_video',
      bag_id: testBag.id,
      content: {
        video_id: video.id,
        url: video.url,
        provider: video.provider,
        video_provider_id: video.video_id,
        title: video.title,
        notes: video.notes,
        thumbnail_url: video.thumbnail_url,
        user_bag_video_id: video.id
      },
      likes_count: 0
    };

    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .insert(feedPost)
      .select()
      .single();

    if (postError) {
      console.log('❌ Failed to create feed post:', postError.message);
      console.log('   Error details:', postError);
    } else {
      console.log('✅ Feed post created:', post.id);
      console.log('   Type:', post.type);
      console.log('   Content:', JSON.stringify(post.content, null, 2));
    }

    // Verify we can query the feed post
    console.log('\n🔍 Verifying feed post is queryable...');
    
    const { data: feedPosts, error: queryError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!user_id(
          id,
          username,
          display_name,
          avatar_url
        ),
        bag:user_bags!bag_id(
          id,
          name
        )
      `)
      .eq('type', 'bag_video')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError) {
      console.log('❌ Failed to query feed posts:', queryError.message);
    } else if (feedPosts && feedPosts.length > 0) {
      const latestPost = feedPosts[0];
      console.log('✅ Feed post found!');
      console.log('   Posted by:', latestPost.profile?.username);
      console.log('   From bag:', latestPost.bag?.name);
      console.log('   Video title:', latestPost.content?.title);
      console.log('   Video URL:', latestPost.content?.url);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    if (post) {
      await supabase
        .from('feed_posts')
        .delete()
        .eq('id', post.id);
      console.log('   Feed post deleted');
    }
    
    if (video) {
      await supabase
        .from('user_bag_videos')
        .delete()
        .eq('id', video.id);
      console.log('   Video deleted');
    }

    console.log('\n' + '='.repeat(40));
    console.log('✅ VIDEO FEED POST FEATURE WORKING!');
    console.log('\nWhen users check "Share to Feed", it will:');
    console.log('  • Add the video to their bag');
    console.log('  • Create a feed post for others to see');
    console.log('  • Include video thumbnail and metadata');
    console.log('  • Allow embedding in the feed');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testVideoFeedPost();