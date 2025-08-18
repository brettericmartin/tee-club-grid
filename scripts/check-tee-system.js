import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTeeSystem() {
  console.log('🏌️ Checking Tee (Like) System...\n');
  console.log('Per CLAUDE.md: "Tees" instead of "Likes" (golf ball on tee icon)');
  console.log('Platform Language: "Teed this up" / "X people teed this"\n');

  try {
    // 1. Check feed_likes table
    console.log('1. Checking feed_likes table...');
    const { data: likesData, error: likesError } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(5);

    if (likesError) {
      console.log('❌ feed_likes table error:', likesError.message);
      if (likesError.code === '42P01') {
        console.log('   Table does not exist! Creating schema...');
        // Table doesn't exist - this is critical
        return false;
      }
    } else {
      console.log('✅ feed_likes table exists');
      console.log(`   Found ${likesData?.length || 0} sample likes`);
    }

    // 2. Check feed_posts table
    console.log('\n2. Checking feed_posts table...');
    const { data: posts, error: postsError } = await supabase
      .from('feed_posts')
      .select('id, post_type, likes_count')
      .limit(5);

    if (postsError) {
      console.log('❌ feed_posts table error:', postsError.message);
    } else {
      console.log('✅ feed_posts table exists');
      console.log(`   Found ${posts?.length || 0} posts`);
      if (posts && posts.length > 0) {
        console.log('   Post types:', [...new Set(posts.map(p => p.post_type))].join(', '));
        console.log('   Sample likes counts:', posts.map(p => p.likes_count).join(', '));
      }
    }

    // 3. Check bag_tees table (for bag likes)
    console.log('\n3. Checking bag_tees table...');
    const { data: bagTees, error: bagTeesError } = await supabase
      .from('bag_tees')
      .select('*')
      .limit(5);

    if (bagTeesError) {
      console.log('⚠️ bag_tees table issue:', bagTeesError.message);
      if (bagTeesError.code === '42P01') {
        console.log('   Table does not exist - may need creation');
      }
    } else {
      console.log('✅ bag_tees table exists');
      console.log(`   Found ${bagTees?.length || 0} bag tees`);
    }

    // 4. Check equipment_tees table
    console.log('\n4. Checking equipment_tees table...');
    const { data: equipTees, error: equipTeesError } = await supabase
      .from('equipment_tees')
      .select('*')
      .limit(5);

    if (equipTeesError) {
      console.log('⚠️ equipment_tees table issue:', equipTeesError.message);
      if (equipTeesError.code === '42P01') {
        console.log('   Table does not exist - may need creation');
      }
    } else {
      console.log('✅ equipment_tees table exists');
      console.log(`   Found ${equipTees?.length || 0} equipment tees`);
    }

    // 5. Test like functionality with a real post
    console.log('\n5. Testing tee functionality...');
    const { data: testPost } = await supabase
      .from('feed_posts')
      .select('id, likes_count')
      .limit(1)
      .single();

    if (testPost) {
      console.log(`   Test post ID: ${testPost.id}`);
      console.log(`   Current likes: ${testPost.likes_count || 0}`);

      // Check if current user has liked this post
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (profiles) {
        const { data: existingLike } = await supabase
          .from('feed_likes')
          .select('*')
          .eq('user_id', profiles.id)
          .eq('post_id', testPost.id)
          .maybeSingle();

        if (existingLike) {
          console.log('   ✅ User has already teed this post');
        } else {
          console.log('   ⚠️ User has not teed this post');
        }
      }
    }

    // 6. Check RLS policies
    console.log('\n6. Checking RLS policies for feed_likes...');
    // Try to insert a test like (will fail if RLS is blocking)
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (testUser && testPost) {
      // First delete any existing like
      await supabase
        .from('feed_likes')
        .delete()
        .eq('user_id', testUser.id)
        .eq('post_id', testPost.id);

      // Try to insert
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          user_id: testUser.id,
          post_id: testPost.id
        });

      if (insertError) {
        console.log('❌ Cannot insert tees:', insertError.message);
        console.log('   RLS policy may be blocking inserts');
      } else {
        console.log('✅ Can insert tees');

        // Try to delete
        const { error: deleteError } = await supabase
          .from('feed_likes')
          .delete()
          .eq('user_id', testUser.id)
          .eq('post_id', testPost.id);

        if (deleteError) {
          console.log('❌ Cannot delete tees:', deleteError.message);
        } else {
          console.log('✅ Can delete tees');
        }
      }
    }

    // 7. Check likes count updates
    console.log('\n7. Checking if likes_count updates...');
    if (testPost) {
      const { data: updatedPost } = await supabase
        .from('feed_posts')
        .select('likes_count')
        .eq('id', testPost.id)
        .single();

      console.log(`   Post likes count: ${updatedPost?.likes_count || 0}`);
      console.log('   Note: likes_count should update via trigger or manual update');
    }

    console.log('\n📊 Summary:');
    console.log('   - feed_likes table: ' + (likesError ? '❌' : '✅'));
    console.log('   - feed_posts table: ' + (postsError ? '❌' : '✅'));
    console.log('   - bag_tees table: ' + (bagTeesError?.code === '42P01' ? '❌ Missing' : '✅'));
    console.log('   - equipment_tees table: ' + (equipTeesError?.code === '42P01' ? '❌ Missing' : '✅'));

    console.log('\n🎯 Required Actions:');
    if (likesError) {
      console.log('   1. Create feed_likes table with proper schema');
    }
    if (bagTeesError?.code === '42P01') {
      console.log('   2. Create bag_tees table for bag likes');
    }
    if (equipTeesError?.code === '42P01') {
      console.log('   3. Create equipment_tees table for equipment likes');
    }
    console.log('   4. Ensure RLS policies allow authenticated users to insert/delete their own likes');
    console.log('   5. Add triggers to update likes_count on feed_posts');

  } catch (error) {
    console.error('❌ Error checking tee system:', error);
  }
}

checkTeeSystem();