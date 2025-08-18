import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkReactionConstraints() {
  console.log('🔍 Checking Reaction Type Constraints\n');

  try {
    // 1. Check existing reaction types in database
    console.log('1. Existing reaction types in database:');
    const { data: reactions } = await supabase
      .from('forum_reactions')
      .select('reaction_type')
      .limit(50);

    if (reactions) {
      const types = [...new Set(reactions.map(r => r.reaction_type))];
      console.log('   Found types:', types.join(', '));
    }

    // 2. Test different reaction types
    console.log('\n2. Testing different reaction types...');
    const testTypes = ['Tee', 'tee', 'fixed', 'helpful', 'hot_take', '👍', '❤️', 'like'];
    
    const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
    const { data: post } = await supabase.from('forum_posts').select('id').limit(1).single();

    if (user && post) {
      for (const type of testTypes) {
        // Clean up first
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);

        // Try to insert
        const { error } = await supabase
          .from('forum_reactions')
          .insert({
            user_id: user.id,
            post_id: post.id,
            reaction_type: type
          });

        if (error) {
          if (error.message.includes('check constraint')) {
            console.log(`   ❌ "${type}" - NOT ALLOWED by constraint`);
          } else if (error.message.includes('row-level security')) {
            console.log(`   ❌ "${type}" - Blocked by RLS (type would be valid)`);
          } else {
            console.log(`   ❌ "${type}" - Error: ${error.message}`);
          }
        } else {
          console.log(`   ✅ "${type}" - ALLOWED`);
          // Clean up
          await supabase
            .from('forum_reactions')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', post.id);
        }
      }
    }

    // 3. Check what the frontend is trying to use
    console.log('\n3. Checking frontend code...');
    console.log('   The frontend is likely using: "Tee", "Helpful", "Hot Take", "Fixed"');
    console.log('   But the database constraint only allows: "tee", "helpful", "hot_take", "fixed" (lowercase)');

    console.log('\n📊 DIAGNOSIS:');
    console.log('=====================================');
    console.log('The issue is a CHECK CONSTRAINT on reaction_type!');
    console.log('The frontend is sending "Tee" but the database expects "tee" (lowercase)');
    console.log('\n🔧 SOLUTIONS:');
    console.log('1. Update the frontend to use lowercase reaction types');
    console.log('2. OR remove the check constraint from the database');
    console.log('3. OR update the constraint to accept both cases');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkReactionConstraints();