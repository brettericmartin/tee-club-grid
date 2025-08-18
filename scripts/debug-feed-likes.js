import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugFeedLikes() {
  console.log('🔍 Debugging Feed Likes Issue\n');

  try {
    // 1. Check feed_posts structure
    console.log('1. Checking feed_posts structure...');
    const { data: posts, error: postsError } = await supabase
      .from('feed_posts')
      .select('id, content, likes_count, created_at')
      .limit(3);

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError);
      return;
    }

    console.log(`✅ Found ${posts?.length || 0} posts`);
    posts?.forEach(post => {
      console.log(`   - Post ${post.id.substring(0, 8)}... has likes_count: ${post.likes_count || 0}`);
    });

    // 2. Check feed_likes data
    console.log('\n2. Checking feed_likes table...');
    const { data: likes, error: likesError } = await supabase
      .from('feed_likes')
      .select('post_id, user_id, created_at')
      .limit(5);

    if (likesError) {
      console.error('❌ Error fetching likes:', likesError);
    } else {
      console.log(`✅ Found ${likes?.length || 0} likes in feed_likes table`);
      
      // Count likes per post
      if (posts && posts.length > 0) {
        for (const post of posts) {
          const { count } = await supabase
            .from('feed_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          console.log(`   Post ${post.id.substring(0, 8)}... has ${count || 0} actual likes in feed_likes table`);
          
          if ((count || 0) !== (post.likes_count || 0)) {
            console.log(`   ⚠️ MISMATCH: likes_count=${post.likes_count}, actual=${count}`);
          }
        }
      }
    }

    // 3. Test the join query used in the app
    console.log('\n3. Testing the feed query with joins...');
    const { data: feedData, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url
        ),
        feed_likes!left(
          id,
          user_id
        )
      `)
      .limit(3);

    if (feedError) {
      console.error('❌ Feed query error:', feedError);
    } else {
      console.log('✅ Feed query successful');
      feedData?.forEach(post => {
        console.log(`   Post ${post.id.substring(0, 8)}...:`);
        console.log(`     - likes_count field: ${post.likes_count || 0}`);
        console.log(`     - feed_likes join: ${post.feed_likes?.length || 0} records`);
      });
    }

    // 4. Test if we can insert a like
    console.log('\n4. Testing like insertion...');
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (testUser && posts && posts[0]) {
      // First remove any existing like
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
        console.log('❌ Cannot insert like:', insertError.message);
        if (insertError.message.includes('violates row-level security')) {
          console.log('   RLS is blocking inserts!');
        }
      } else {
        console.log('✅ Successfully inserted a test like');
        
        // Clean up
        await supabase
          .from('feed_likes')
          .delete()
          .eq('user_id', testUser.id)
          .eq('post_id', posts[0].id);
      }
    }

    // 5. Check if likes_count is being updated
    console.log('\n5. Checking if likes_count updates...');
    if (posts && posts[0]) {
      const { data: updatedPost } = await supabase
        .from('feed_posts')
        .select('likes_count')
        .eq('id', posts[0].id)
        .single();
      
      console.log(`   Post likes_count after operations: ${updatedPost?.likes_count || 0}`);
    }

    console.log('\n📊 DIAGNOSIS:');
    console.log('================');
    if (likesError) {
      console.log('❌ feed_likes table has issues');
    }
    if (feedError) {
      console.log('❌ Join queries are failing');
    }
    console.log('\n🔧 SOLUTION:');
    console.log('1. Run the SQL script: sql/fix-tee-system-final.sql');
    console.log('2. This will fix RLS policies and add triggers');
    console.log('3. Likes will then save and display correctly');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFeedLikes();