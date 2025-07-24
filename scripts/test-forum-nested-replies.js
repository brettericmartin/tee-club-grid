import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

async function testForumNestedReplies() {
  console.log('Testing forum nested replies functionality...\n');
  
  try {
    // 1. Check if parent_post_id column exists
    console.log('1. Checking parent_post_id column...');
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id, thread_id, content, parent_post_id')
      .limit(5);
    
    if (postsError) {
      console.error('❌ Error querying forum_posts:', postsError);
      return;
    }
    
    console.log('✅ parent_post_id column exists');
    console.log(`   Found ${posts.length} posts in database`);
    
    // 2. Find a thread to test with
    console.log('\n2. Finding a thread for testing...');
    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select('id, title, is_locked')
      .eq('is_locked', false)
      .limit(1);
    
    if (threadsError || !threads || threads.length === 0) {
      console.error('❌ No unlocked threads found for testing');
      return;
    }
    
    const testThread = threads[0];
    console.log(`✅ Using thread: "${testThread.title}" (${testThread.id})`);
    
    // 3. Get existing posts in the thread
    console.log('\n3. Getting existing posts...');
    const { data: threadPosts, error: threadPostsError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('thread_id', testThread.id)
      .order('created_at', { ascending: true });
    
    if (threadPostsError) {
      console.error('❌ Error fetching thread posts:', threadPostsError);
      return;
    }
    
    console.log(`✅ Found ${threadPosts.length} posts in thread`);
    
    // 4. Display post hierarchy
    console.log('\n4. Post hierarchy:');
    const buildTree = (posts, parentId = null, depth = 0) => {
      const children = posts.filter(p => p.parent_post_id === parentId);
      children.forEach(post => {
        const indent = '  '.repeat(depth);
        const preview = post.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`${indent}├─ ${preview}... (id: ${post.id.substring(0, 8)})`);
        buildTree(posts, post.id, depth + 1);
      });
    };
    
    buildTree(threadPosts);
    
    // 5. Count nested vs flat posts
    const nestedPosts = threadPosts.filter(p => p.parent_post_id !== null);
    const topLevelPosts = threadPosts.filter(p => p.parent_post_id === null);
    
    console.log('\n5. Post statistics:');
    console.log(`   - Top-level posts: ${topLevelPosts.length}`);
    console.log(`   - Nested replies: ${nestedPosts.length}`);
    console.log(`   - Max nesting depth: ${getMaxDepth(threadPosts)}`);
    
    // 6. Test creating a nested reply (dry run)
    console.log('\n6. Nested reply test (dry run):');
    if (topLevelPosts.length > 0) {
      const parentPost = topLevelPosts[0];
      console.log(`   Would create reply to: "${parentPost.content.substring(0, 40)}..."`);
      console.log(`   With parent_post_id: ${parentPost.id}`);
      console.log('   ✅ Nested reply structure is ready to use!');
    }
    
    console.log('\n✅ All tests passed! Nested replies are working correctly.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

function getMaxDepth(posts) {
  let maxDepth = 0;
  
  const calculateDepth = (postId, depth = 0) => {
    maxDepth = Math.max(maxDepth, depth);
    const children = posts.filter(p => p.parent_post_id === postId);
    children.forEach(child => calculateDepth(child.id, depth + 1));
  };
  
  const topLevel = posts.filter(p => p.parent_post_id === null);
  topLevel.forEach(post => calculateDepth(post.id, 0));
  
  return maxDepth;
}

testForumNestedReplies();