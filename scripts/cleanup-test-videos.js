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

async function cleanupTestVideos() {
  try {
    console.log('🧹 Cleaning Up Test Video Posts\n');
    console.log('='.repeat(50));
    
    // First, find all video posts
    console.log('\n📋 Finding all video posts in feed...\n');
    
    const { data: videoPosts, error: queryError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        created_at,
        content,
        user_id,
        profile:profiles!user_id(username)
      `)
      .eq('type', 'bag_video')
      .order('created_at', { ascending: false });
    
    if (queryError) {
      console.error('❌ Error querying video posts:', queryError);
      return;
    }
    
    if (!videoPosts || videoPosts.length === 0) {
      console.log('No video posts found in feed.');
      return;
    }
    
    console.log(`Found ${videoPosts.length} video posts:\n`);
    
    // Display all video posts
    const postsToDelete = [];
    let goodGoodPost = null;
    
    videoPosts.forEach((post, index) => {
      const username = post.profile?.username || 'Unknown';
      const title = post.content?.title || 'No title';
      const url = post.content?.url || '';
      const notes = post.content?.notes || '';
      const date = new Date(post.created_at).toLocaleString();
      
      console.log(`${index + 1}. User: ${username}`);
      console.log(`   Title: ${title}`);
      console.log(`   URL: ${url}`);
      console.log(`   Notes: ${notes}`);
      console.log(`   Created: ${date}`);
      console.log(`   Post ID: ${post.id}`);
      
      // Check if this is the Good Good road trip video from brettmartinplay
      const isGoodGoodVideo = 
        username === 'brettmartinplay' && 
        (title.toLowerCase().includes('good good') || 
         notes.toLowerCase().includes('good good') ||
         title.toLowerCase().includes('road trip') ||
         notes.toLowerCase().includes('road trip'));
      
      // Also check for test videos
      const isTestVideo = 
        title.toLowerCase().includes('test') ||
        notes.toLowerCase().includes('test') ||
        title.includes('Tiger Woods') ||
        url.includes('ScMzIvxBSi4'); // Test video ID we've been using
      
      if (isGoodGoodVideo) {
        console.log('   ✅ KEEP - Good Good road trip video');
        goodGoodPost = post;
      } else if (isTestVideo) {
        console.log('   ❌ DELETE - Test video');
        postsToDelete.push(post);
      } else {
        console.log('   ⚠️  REVIEW - Not clearly identified');
        // For safety, we'll ask about unclear videos
      }
      
      console.log('');
    });
    
    // Show summary
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   Total video posts: ${videoPosts.length}`);
    console.log(`   Good Good video found: ${goodGoodPost ? 'Yes' : 'No'}`);
    console.log(`   Test videos to delete: ${postsToDelete.length}`);
    
    if (postsToDelete.length === 0) {
      console.log('\n✅ No test videos to delete.');
      return;
    }
    
    // Delete test video posts
    console.log('\n🗑️  Deleting test video posts...\n');
    
    for (const post of postsToDelete) {
      const username = post.profile?.username || 'Unknown';
      const title = post.content?.title || 'No title';
      
      // Delete the feed post
      const { error: deleteError } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', post.id);
      
      if (deleteError) {
        console.log(`❌ Failed to delete post ${post.id}: ${deleteError.message}`);
      } else {
        console.log(`✅ Deleted: "${title}" by ${username}`);
        
        // Also delete the video from user_bag_videos if it's a test
        if (post.content?.user_bag_video_id) {
          const { error: videoDeleteError } = await supabase
            .from('user_bag_videos')
            .delete()
            .eq('id', post.content.user_bag_video_id);
          
          if (videoDeleteError) {
            console.log(`   ⚠️  Could not delete video record: ${videoDeleteError.message}`);
          } else {
            console.log(`   ✅ Also deleted video record`);
          }
        }
      }
    }
    
    // Final verification
    console.log('\n='.repeat(50));
    console.log('\n🔍 Final verification...\n');
    
    const { data: remainingPosts, error: finalError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        content,
        profile:profiles!user_id(username)
      `)
      .eq('type', 'bag_video');
    
    if (finalError) {
      console.log('❌ Error checking remaining posts:', finalError);
    } else if (remainingPosts) {
      console.log(`✅ ${remainingPosts.length} video post(s) remaining:`);
      remainingPosts.forEach(post => {
        const username = post.profile?.username || 'Unknown';
        const title = post.content?.title || 'No title';
        console.log(`   - "${title}" by ${username}`);
      });
    }
    
    console.log('\n✨ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanupTestVideos();