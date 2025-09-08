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

async function findGoodGoodVideo() {
  try {
    console.log('🔍 Searching for Good Good Road Trip Video\n');
    console.log('='.repeat(50));
    
    // Check for brettmartinplay user
    console.log('\n1️⃣ Looking for user brettmartinplay...');
    
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or('username.eq.brettmartinplay,username.ilike.%brett%,email.ilike.%brett%');
    
    if (userError) {
      console.error('❌ Error searching for user:', userError);
      return;
    }
    
    if (users && users.length > 0) {
      console.log(`Found ${users.length} potential user(s):`);
      users.forEach(user => {
        console.log(`   - ${user.username || user.email} (ID: ${user.id})`);
      });
    } else {
      console.log('No users found matching "brett"');
    }
    
    // Search all videos for Good Good content
    console.log('\n2️⃣ Searching all videos for Good Good content...');
    
    const { data: allVideos, error: videoError } = await supabase
      .from('user_bag_videos')
      .select(`
        id,
        title,
        notes,
        url,
        share_to_feed,
        created_at,
        user_id,
        profile:profiles!user_id(username, email)
      `)
      .or('title.ilike.%good good%,notes.ilike.%good good%,title.ilike.%road trip%,notes.ilike.%road trip%')
      .order('created_at', { ascending: false });
    
    if (videoError) {
      console.error('❌ Error searching videos:', videoError);
    } else if (allVideos && allVideos.length > 0) {
      console.log(`\nFound ${allVideos.length} video(s) that might be Good Good related:\n`);
      allVideos.forEach((video, index) => {
        const username = video.profile?.username || video.profile?.email || 'Unknown';
        console.log(`${index + 1}. User: ${username}`);
        console.log(`   Title: ${video.title}`);
        console.log(`   Notes: ${video.notes || 'None'}`);
        console.log(`   URL: ${video.url}`);
        console.log(`   Shared to feed: ${video.share_to_feed}`);
        console.log(`   Created: ${new Date(video.created_at).toLocaleString()}`);
        console.log(`   Video ID: ${video.id}`);
        console.log('');
      });
      
      // Check if any of these have feed posts
      console.log('3️⃣ Checking if these videos have feed posts...\n');
      
      for (const video of allVideos) {
        const { data: feedPost, error: feedError } = await supabase
          .from('feed_posts')
          .select('id, created_at')
          .eq('type', 'bag_video')
          .or(`content->user_bag_video_id.eq.${video.id},content->video_id.eq.${video.id}`)
          .single();
        
        if (feedPost) {
          console.log(`✅ Video "${video.title}" HAS a feed post (ID: ${feedPost.id})`);
        } else {
          console.log(`❌ Video "${video.title}" does NOT have a feed post`);
          
          if (video.share_to_feed) {
            console.log('   ⚠️  This video should have a feed post but doesn\'t!');
          }
        }
      }
    } else {
      console.log('No videos found with "good good" or "road trip" in title/notes');
    }
    
    // Search all videos in the system
    console.log('\n4️⃣ Listing ALL videos in the system for review...');
    
    const { data: allSystemVideos, error: allError } = await supabase
      .from('user_bag_videos')
      .select(`
        id,
        title,
        notes,
        url,
        share_to_feed,
        created_at,
        profile:profiles!user_id(username, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (allError) {
      console.error('❌ Error listing all videos:', allError);
    } else if (allSystemVideos && allSystemVideos.length > 0) {
      console.log(`\nShowing last 20 videos in system:\n`);
      allSystemVideos.forEach((video, index) => {
        const username = video.profile?.username || video.profile?.email || 'Unknown';
        console.log(`${index + 1}. [${username}] ${video.title || 'Untitled'}`);
        if (video.notes) {
          console.log(`   Notes: ${video.notes.substring(0, 100)}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📋 Summary:');
    console.log('The Good Good road trip video from brettmartinplay was not found.');
    console.log('It may need to be added or the username might be different.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

findGoodGoodVideo();