import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkForumStructure() {
  console.log('🔍 Checking Forum Tables Structure\n');

  try {
    // Check forum_posts
    console.log('1. forum_posts table:');
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .limit(1);

    if (postsError) {
      console.log('❌ Error:', postsError.message);
    } else if (posts && posts[0]) {
      console.log('✅ Table exists with columns:');
      Object.keys(posts[0]).forEach(col => {
        console.log(`   - ${col}: ${typeof posts[0][col]}`);
      });
    } else {
      console.log('✅ Table exists but is empty');
    }

    // Check forum_comments
    console.log('\n2. forum_comments table:');
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select('*')
      .limit(1);

    if (commentsError) {
      if (commentsError.code === '42P01') {
        console.log('❌ Table does not exist');
      } else {
        console.log('⚠️ Error:', commentsError.message);
      }
    } else if (comments && comments[0]) {
      console.log('✅ Table exists with columns:');
      Object.keys(comments[0]).forEach(col => {
        console.log(`   - ${col}: ${typeof comments[0][col]}`);
      });
    } else {
      console.log('✅ Table exists but is empty');
    }

    // Check forum_reactions
    console.log('\n3. forum_reactions table:');
    const { data: reactions, error: reactionsError } = await supabase
      .from('forum_reactions')
      .select('*')
      .limit(1);

    if (reactionsError) {
      console.log('❌ Error:', reactionsError.message);
    } else if (reactions && reactions[0]) {
      console.log('✅ Table exists with columns:');
      Object.keys(reactions[0]).forEach(col => {
        console.log(`   - ${col}: ${typeof reactions[0][col]}`);
      });
    } else {
      console.log('✅ Table exists but is empty');
    }

    // Now test reaction insert with actual post ID
    console.log('\n4. Testing reaction insert...');
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    // Get a real post ID from forum_posts
    const { data: testPost } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(1)
      .single();

    if (user && testPost) {
      console.log(`   Using user: ${user.id.substring(0, 8)}...`);
      console.log(`   Using post: ${testPost.id.substring(0, 8)}...`);

      // Clean up first
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', testPost.id);

      // Try to insert
      const { error: insertError } = await supabase
        .from('forum_reactions')
        .insert({
          user_id: user.id,
          post_id: testPost.id,
          reaction_type: '👍'
        });

      if (insertError) {
        console.log('❌ Cannot insert reaction:', insertError.message);
        if (insertError.message.includes('row-level security')) {
          console.log('   🚨 RLS is blocking inserts - needs fix!');
        }
      } else {
        console.log('✅ Reaction inserted successfully');
        
        // Clean up
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', testPost.id);
      }
    } else {
      console.log('⚠️ No test data available');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkForumStructure();