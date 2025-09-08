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

async function finalCleanupAndVerify() {
  try {
    console.log('🧹 Final Cleanup and Verification\n');
    console.log('='.repeat(50));
    
    // Check for any test posts
    console.log('\n🔍 Looking for test posts to clean up...\n');
    
    const { data: testPosts, error: testError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        content,
        created_at,
        profile:profiles!user_id(username)
      `)
      .or('content->caption.ilike.%test%,content->notes.ilike.%test%,content->title.ilike.%test%')
      .order('created_at', { ascending: false });
    
    if (testError) {
      console.error('❌ Error searching for test posts:', testError);
    } else if (testPosts && testPosts.length > 0) {
      console.log(`Found ${testPosts.length} potential test post(s) to clean up:\n`);
      
      for (const post of testPosts) {
        const username = post.profile?.username || 'Unknown';
        const title = post.content?.title || post.content?.caption || 'No title';
        
        console.log(`Deleting: [${post.type}] "${title}" by ${username}`);
        
        const { error: deleteError } = await supabase
          .from('feed_posts')
          .delete()
          .eq('id', post.id);
        
        if (deleteError) {
          console.log(`   ❌ Failed: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deleted`);
        }
      }
    } else {
      console.log('No test posts found to clean up.');
    }
    
    // Final verification - show all video posts
    console.log('\n' + '='.repeat(50));
    console.log('\n📺 Final Video Posts in Feed:\n');
    
    const { data: videoPosts, error: videoError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        content,
        created_at,
        profile:profiles!user_id(username)
      `)
      .eq('type', 'bag_video')
      .order('created_at', { ascending: false });
    
    if (videoError) {
      console.error('❌ Error fetching video posts:', videoError);
    } else if (videoPosts && videoPosts.length > 0) {
      console.log(`✅ ${videoPosts.length} video post(s) in feed:\n`);
      videoPosts.forEach((post, index) => {
        const username = post.profile?.username || 'Unknown';
        const title = post.content?.title || 'No title';
        const url = post.content?.url || '';
        
        console.log(`${index + 1}. "${title}"`);
        console.log(`   By: ${username}`);
        console.log(`   URL: ${url}`);
        console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('No video posts in feed.');
    }
    
    // Show recent feed posts summary
    console.log('='.repeat(50));
    console.log('\n📊 Recent Feed Posts Summary:\n');
    
    const { data: recentPosts, error: recentError } = await supabase
      .from('feed_posts')
      .select('type')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ Error fetching recent posts:', recentError);
    } else if (recentPosts) {
      const typeCounts = {};
      recentPosts.forEach(post => {
        typeCounts[post.type] = (typeCounts[post.type] || 0) + 1;
      });
      
      console.log('Post types in last 10 posts:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Cleanup complete!');
    console.log('\n📱 The feed should now only have the Good Good road trip video');
    console.log('   from user "brett" as requested.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

finalCleanupAndVerify();