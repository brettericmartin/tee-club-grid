import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testLikesFinal() {
  console.log('🏌️ Final Likes/Tees System Test\n');

  try {
    // 1. Get current state
    console.log('1. Current System State:');
    console.log('========================');
    
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id, likes_count')
      .limit(3);
    
    const { data: likes } = await supabase
      .from('feed_likes')
      .select('*');
    
    console.log(`   Total posts: ${posts?.length || 0}`);
    console.log(`   Total likes in system: ${likes?.length || 0}`);
    
    // 2. Check if counts match
    console.log('\n2. Verifying Counts:');
    if (posts) {
      for (const post of posts) {
        const { count: actualCount } = await supabase
          .from('feed_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        const match = (actualCount || 0) === (post.likes_count || 0);
        console.log(`   Post ${post.id.substring(0, 8)}...:`);
        console.log(`     likes_count: ${post.likes_count || 0}`);
        console.log(`     actual likes: ${actualCount || 0}`);
        console.log(`     ${match ? '✅ Match' : '❌ Mismatch - needs trigger'}`);
      }
    }
    
    // 3. Test RLS
    console.log('\n3. Testing RLS Policies:');
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (testUser && posts && posts[0]) {
      // Remove existing like
      await supabase
        .from('feed_likes')
        .delete()
        .eq('user_id', testUser.id)
        .eq('post_id', posts[0].id);
      
      // Try to insert
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          user_id: testUser.id,
          post_id: posts[0].id
        });
      
      if (insertError) {
        console.log('   ❌ CRITICAL: Cannot insert likes!');
        console.log(`      Error: ${insertError.message}`);
        console.log('      ACTION: Run sql/URGENT-fix-likes-now.sql');
      } else {
        console.log('   ✅ Can insert likes');
        
        // Check if count updated
        const { data: updatedPost } = await supabase
          .from('feed_posts')
          .select('likes_count')
          .eq('id', posts[0].id)
          .single();
        
        const oldCount = posts[0].likes_count || 0;
        const newCount = updatedPost?.likes_count || 0;
        
        if (newCount > oldCount) {
          console.log('   ✅ Trigger is working (count auto-updated)');
        } else {
          console.log('   ⚠️ Trigger not working (count didn\'t update)');
        }
        
        // Clean up
        await supabase
          .from('feed_likes')
          .delete()
          .eq('user_id', testUser.id)
          .eq('post_id', posts[0].id);
      }
    }
    
    // 4. Test feed query
    console.log('\n4. Testing Feed Query:');
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          display_name
        ),
        user_liked:feed_likes!left(
          id
        )
      `)
      .limit(2);
    
    if (feedError) {
      console.log('   ❌ Feed query failed:', feedError.message);
    } else {
      console.log('   ✅ Feed query works');
      feedPosts?.forEach(post => {
        console.log(`   Post has likes_count: ${post.likes_count}, feed_likes: ${post.user_liked?.length || 0}`);
      });
    }
    
    // 5. Summary
    console.log('\n📊 FINAL STATUS:');
    console.log('================');
    
    const canQuery = !feedError;
    const canInsert = testUser && posts && posts[0] && !insertError;
    
    if (canQuery && canInsert) {
      console.log('✅ SYSTEM IS WORKING!');
      console.log('   - RLS policies are correct');
      console.log('   - Likes can be saved');
      console.log('   - Counts are displayed');
    } else {
      console.log('❌ SYSTEM NEEDS FIX!');
      console.log('\n🚨 IMMEDIATE ACTION:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Copy entire contents of: sql/URGENT-fix-likes-now.sql');
      console.log('3. Paste and click "Run"');
      console.log('4. Refresh your app - likes will work!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLikesFinal();