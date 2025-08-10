#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function testFeedLikesCount() {
  console.log('🧪 Testing feed likes count functionality...\n');

  try {
    // 1. Get a sample feed post
    console.log('1️⃣ Getting a sample feed post...');
    const { data: posts, error: postError } = await supabase
      .from('feed_posts')
      .select('id, content')
      .limit(3);
      
    if (postError || !posts || posts.length === 0) {
      console.error('No feed posts found');
      return;
    }
    
    console.log(`Found ${posts.length} posts`);
    
    // 2. For each post, count likes manually
    for (const post of posts) {
      console.log(`\n📋 Post: ${post.id.substring(0, 8)}...`);
      console.log(`   Content: ${JSON.stringify(post.content).substring(0, 50)}...`);
      
      // Count likes directly
      const { count: directCount, error: countError } = await supabase
        .from('feed_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
        
      if (countError) {
        console.error('Error counting likes:', countError);
      } else {
        console.log(`   Direct like count: ${directCount || 0}`);
      }
      
      // Test the join query
      const { data: postWithLikes, error: joinError } = await supabase
        .from('feed_posts')
        .select(`
          id,
          content,
          feed_likes(count)
        `)
        .eq('id', post.id)
        .single();
        
      if (joinError) {
        console.error('Error with join query:', joinError);
      } else {
        const joinCount = postWithLikes?.feed_likes?.[0]?.count || 0;
        console.log(`   Join query count: ${joinCount}`);
        
        if (directCount !== joinCount) {
          console.warn('   ⚠️  Count mismatch!');
        }
      }
      
      // Check if likes_count column exists on feed_posts
      const { data: postColumns } = await supabase
        .from('feed_posts')
        .select('likes_count')
        .eq('id', post.id)
        .single();
        
      if (postColumns && 'likes_count' in postColumns) {
        console.log(`   Column likes_count: ${postColumns.likes_count || 0}`);
      } else {
        console.log(`   Column likes_count: NOT FOUND (expected)`);
      }
    }
    
    // 3. Test the actual query used in getFeedPosts
    console.log('\n3️⃣ Testing the full getFeedPosts query...');
    const { data: fullQuery, error: fullError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          avatar_url,
          handicap
        ),
        feed_likes(count)
      `)
      .limit(3);
      
    if (fullError) {
      console.error('Full query error:', fullError);
    } else {
      console.log('Full query successful!');
      fullQuery?.forEach(post => {
        const likeCount = post.feed_likes?.[0]?.count || 0;
        console.log(`  Post ${post.id.substring(0, 8)}... has ${likeCount} likes`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFeedLikesCount()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });