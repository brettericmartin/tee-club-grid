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

async function createGoodGoodFeedPost() {
  try {
    console.log('🎬 Creating Feed Post for Good Good Road Trip Video\n');
    console.log('='.repeat(50));
    
    // Get the video details
    const videoId = 'a2010e53-b118-43ae-a12e-c2223348fd0c';
    const userId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // brett's user ID
    
    console.log('📹 Getting video details...');
    
    const { data: video, error: videoError } = await supabase
      .from('user_bag_videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    if (videoError || !video) {
      console.error('❌ Error getting video:', videoError);
      return;
    }
    
    console.log('✅ Found video:');
    console.log(`   Title: ${video.title}`);
    console.log(`   URL: ${video.url}`);
    console.log(`   Bag ID: ${video.bag_id}`);
    
    // Parse the YouTube URL to get the video ID
    const urlParams = new URLSearchParams(new URL(video.url).search);
    const youtubeVideoId = urlParams.get('v') || 'JosfaSgzSxM';
    
    // Generate thumbnail URL for YouTube video
    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    
    // Create the feed post
    console.log('\n📰 Creating feed post...');
    
    const feedPost = {
      user_id: userId,
      type: 'bag_video',
      bag_id: video.bag_id,
      content: {
        video_id: video.id,
        url: video.url,
        provider: video.provider || 'youtube',
        video_provider_id: video.video_id || youtubeVideoId,
        title: video.title,
        notes: video.notes,
        thumbnail_url: video.thumbnail_url || thumbnailUrl,
        user_bag_video_id: video.id
      },
      likes_count: 0,
      created_at: video.created_at // Use the same timestamp as the video
    };
    
    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .insert(feedPost)
      .select()
      .single();
    
    if (postError) {
      console.error('❌ Failed to create feed post:', postError);
      return;
    }
    
    console.log('✅ Feed post created successfully!');
    console.log(`   Post ID: ${post.id}`);
    console.log(`   Type: ${post.type}`);
    console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`);
    
    // Update the video thumbnail if it doesn't have one
    if (!video.thumbnail_url) {
      console.log('\n🖼️  Updating video thumbnail...');
      
      const { error: updateError } = await supabase
        .from('user_bag_videos')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', videoId);
      
      if (updateError) {
        console.log('⚠️  Could not update thumbnail:', updateError.message);
      } else {
        console.log('✅ Thumbnail updated');
      }
    }
    
    // Verify the feed post is queryable
    console.log('\n🔍 Verifying feed post...');
    
    const { data: verifyPost, error: verifyError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        content,
        profile:profiles!user_id(username)
      `)
      .eq('id', post.id)
      .single();
    
    if (verifyError) {
      console.log('❌ Error verifying post:', verifyError);
    } else if (verifyPost) {
      console.log('✅ Feed post verified!');
      console.log(`   User: ${verifyPost.profile?.username}`);
      console.log(`   Video: ${verifyPost.content?.title}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Success! The Good Good road trip video is now in the feed.');
    console.log('📱 Visit http://localhost:3334/feed to see it');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createGoodGoodFeedPost();