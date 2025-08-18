import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugForumReactionsPersist() {
  console.log('🔍 Debugging Forum Reactions Persistence Issue\n');

  try {
    // 1. Check if reactions are being saved
    console.log('1. Checking saved reactions in database...');
    const { data: reactions, error: reactionsError } = await supabase
      .from('forum_reactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (reactionsError) {
      console.error('❌ Error fetching reactions:', reactionsError);
      return;
    }

    console.log(`✅ Found ${reactions?.length || 0} reactions in database`);
    if (reactions && reactions.length > 0) {
      console.log('Recent reactions:');
      reactions.forEach(r => {
        console.log(`   - Post ${r.post_id.substring(0, 8)}... | User ${r.user_id.substring(0, 8)}... | Type: ${r.reaction_type} | Created: ${r.created_at}`);
      });
    }

    // 2. Check RLS policies
    console.log('\n2. Testing RLS policies...');
    
    // Test SELECT
    const { error: selectError } = await supabase
      .from('forum_reactions')
      .select('*')
      .limit(1);
    
    console.log(`   SELECT: ${selectError ? '❌ ' + selectError.message : '✅ Working'}`);

    // Get test data
    const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
    const { data: post } = await supabase.from('forum_posts').select('id').limit(1).single();

    if (user && post) {
      // Clean up first
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);

      // Test INSERT
      const { error: insertError } = await supabase
        .from('forum_reactions')
        .insert({
          user_id: user.id,
          post_id: post.id,
          reaction_type: 'Tee'
        });

      console.log(`   INSERT: ${insertError ? '❌ ' + insertError.message : '✅ Working'}`);

      if (!insertError) {
        // Check if it was actually saved
        const { data: saved, error: checkError } = await supabase
          .from('forum_reactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .single();

        if (saved) {
          console.log('   ✅ Reaction was saved and can be retrieved');
          console.log(`      ID: ${saved.id}`);
          console.log(`      Type: ${saved.reaction_type}`);
          console.log(`      Created: ${saved.created_at}`);

          // Test DELETE
          const { error: deleteError } = await supabase
            .from('forum_reactions')
            .delete()
            .eq('id', saved.id);

          console.log(`   DELETE: ${deleteError ? '❌ ' + deleteError.message : '✅ Working'}`);
        } else {
          console.log('   ❌ Reaction was not saved or cannot be retrieved');
          if (checkError) console.log('      Error:', checkError.message);
        }
      }
    }

    // 3. Check for duplicate key issues
    console.log('\n3. Checking for duplicate reaction attempts...');
    if (user && post) {
      // Try to insert twice
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);

      const { error: first } = await supabase
        .from('forum_reactions')
        .insert({
          user_id: user.id,
          post_id: post.id,
          reaction_type: 'Tee'
        });

      if (!first) {
        const { error: second } = await supabase
          .from('forum_reactions')
          .insert({
            user_id: user.id,
            post_id: post.id,
            reaction_type: 'Helpful'
          });

        if (second) {
          console.log('   ⚠️ Duplicate prevention working:', second.message);
          if (second.code === '23505') {
            console.log('   This is expected - user can only have one reaction per post');
          }
        } else {
          console.log('   ❌ Duplicate prevention NOT working - this could cause issues');
        }

        // Clean up
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
      }
    }

    // 4. Check table constraints
    console.log('\n4. Checking table structure...');
    const { data: sample } = await supabase
      .from('forum_reactions')
      .select('*')
      .limit(1);

    if (sample && sample[0]) {
      console.log('   Table columns:', Object.keys(sample[0]).join(', '));
    }

    // 5. Count reactions per post
    console.log('\n5. Checking reaction counts per post...');
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(5);

    if (posts) {
      for (const p of posts) {
        const { count } = await supabase
          .from('forum_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', p.id);

        if (count && count > 0) {
          console.log(`   Post ${p.id.substring(0, 8)}... has ${count} reactions`);
        }
      }
    }

    // 6. Summary
    console.log('\n📊 DIAGNOSIS:');
    if (!insertError) {
      console.log('✅ Reactions CAN be saved to database');
      console.log('✅ RLS policies are working');
      console.log('\n🤔 If reactions aren\'t persisting in UI:');
      console.log('   1. Check if frontend is properly calling the insert API');
      console.log('   2. Check if frontend is handling errors correctly');
      console.log('   3. Check if there\'s a race condition on page refresh');
      console.log('   4. Check browser console for JavaScript errors');
    } else {
      console.log('❌ Reactions CANNOT be saved');
      console.log('   RLS policies still need to be fixed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugForumReactionsPersist();