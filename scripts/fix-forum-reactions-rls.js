#!/usr/bin/env node
import { supabase } from './supabase-admin.js';

async function fixForumReactionsRLS() {
  console.log('🔧 Fixing Forum Reactions RLS Policies\n');
  
  const policies = [
    // Enable RLS
    `ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;`,
    
    // Drop existing policies
    `DROP POLICY IF EXISTS "Users can view all reactions" ON forum_reactions;`,
    `DROP POLICY IF EXISTS "Users can add reactions" ON forum_reactions;`,
    `DROP POLICY IF EXISTS "Users can remove own reactions" ON forum_reactions;`,
    `DROP POLICY IF EXISTS "forum_reactions_select_policy" ON forum_reactions;`,
    `DROP POLICY IF EXISTS "forum_reactions_insert_policy" ON forum_reactions;`,
    `DROP POLICY IF EXISTS "forum_reactions_delete_policy" ON forum_reactions;`,
    
    // SELECT: Anyone can view reactions
    `CREATE POLICY "forum_reactions_select_policy" 
     ON forum_reactions 
     FOR SELECT 
     USING (true);`,
    
    // INSERT: Authenticated users can add reactions
    `CREATE POLICY "forum_reactions_insert_policy" 
     ON forum_reactions 
     FOR INSERT 
     WITH CHECK (auth.uid() = user_id);`,
    
    // DELETE: Users can only delete their own reactions
    `CREATE POLICY "forum_reactions_delete_policy" 
     ON forum_reactions 
     FOR DELETE 
     USING (auth.uid() = user_id);`
  ];
  
  try {
    console.log('📝 Generated SQL for forum_reactions RLS:\n');
    console.log('```sql');
    policies.forEach(sql => console.log(sql));
    console.log('```');
    
    console.log('\n✅ RLS policies have been prepared for forum_reactions table');
    console.log('\nThe policies enable:');
    console.log('  - Anyone can view reactions (SELECT)');
    console.log('  - Authenticated users can add reactions (INSERT where user_id = auth.uid())');
    console.log('  - Users can remove their own reactions (DELETE where user_id = auth.uid())');
    
    // Test the current state
    console.log('\n🔍 Testing current forum_reactions access...\n');
    
    // Try to get some reactions
    const { data: reactions, error: fetchError } = await supabase
      .from('forum_reactions')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.log('❌ Error fetching reactions:', fetchError.message);
    } else {
      console.log(`✅ Can fetch reactions: ${reactions?.length || 0} found`);
    }
    
    // Check if there are any forum posts to test with
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(1);
    
    if (!postsError && posts && posts.length > 0) {
      console.log(`\n📊 Found test post: ${posts[0].id}`);
      
      // Check existing reactions for this post
      const { data: postReactions, error: postReactionsError } = await supabase
        .from('forum_reactions')
        .select('*')
        .eq('post_id', posts[0].id);
      
      if (postReactionsError) {
        console.log('❌ Error fetching post reactions:', postReactionsError.message);
      } else {
        console.log(`✅ Post has ${postReactions?.length || 0} reactions`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixForumReactionsRLS();