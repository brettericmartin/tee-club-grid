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

async function createTestVideoPost() {
  try {
    console.log('🎬 Creating Test Video Post for Feed\n');
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
    console.log('👤 Using user:', testUser.username || testUser.email);
    
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
    
    // Create a video entry
    console.log('\n📹 Creating video entry...');
    const videoData = {
      user_id: testUser.id,
      bag_id: testBag.id,
      provider: 'youtube',
      video_id: 'ScMzIvxBSi4',
      url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
      title: 'Test Video - Tiger Woods Golf Shots',
      notes: 'Test video for feed display verification',
      thumbnail_url: 'https://img.youtube.com/vi/ScMzIvxBSi4/maxresdefault.jpg',
      share_to_feed: true
    };
    
    const { data: video, error: videoError } = await supabase
      .from('user_bag_videos')
      .insert(videoData)
      .select()
      .single();
    
    if (videoError) {
      console.log('❌ Failed to create video:', videoError.message);
      return;
    }
    
    console.log('✅ Video created:', video.id);
    
    // Create feed post
    console.log('\n📰 Creating feed post...');
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
      return;
    }
    
    console.log('✅ Feed post created:', post.id);
    
    // Also create a regular equipment photo post for comparison
    console.log('\n📷 Creating photo post for comparison...');
    
    // Get an equipment item
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, brand, model, image_url')
      .limit(1)
      .single();
    
    if (equipment) {
      const photoPost = {
        user_id: testUser.id,
        type: 'equipment_photo',
        bag_id: testBag.id,
        equipment_id: equipment.id,
        content: {
          equipment_id: equipment.id,
          equipment_name: `${equipment.brand} ${equipment.model}`,
          photo_url: equipment.image_url,
          caption: 'Test photo post for comparison'
        },
        media_urls: [equipment.image_url],
        likes_count: 0
      };
      
      const { data: photoPostData, error: photoError } = await supabase
        .from('feed_posts')
        .insert(photoPost)
        .select()
        .single();
      
      if (photoError) {
        console.log('⚠️  Could not create photo post:', photoError.message);
      } else {
        console.log('✅ Photo post created:', photoPostData.id);
      }
    }
    
    // Query to verify posts exist
    console.log('\n🔍 Verifying posts in feed...');
    const { data: feedPosts, error: queryError } = await supabase
      .from('feed_posts')
      .select('id, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (queryError) {
      console.log('❌ Error querying feed:', queryError.message);
    } else {
      console.log(`✅ Found ${feedPosts.length} recent posts:`);
      feedPosts.forEach(p => {
        console.log(`   - ${p.type} (${new Date(p.created_at).toLocaleString()})`);
      });
    }
    
    console.log('\n' + '='.repeat(40));
    console.log('✨ Test posts created successfully!');
    console.log('\n📱 Open http://localhost:3334/feed to see them');
    console.log('\n🧹 To clean up test data later, run:');
    console.log('   node scripts/cleanup-test-posts.js');
    
    return { videoPostId: post.id, videoId: video.id };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestVideoPost();