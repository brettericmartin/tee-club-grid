import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyRLSApplied() {
  console.log('🔍 Verifying RLS Policies Were Applied\n');

  const tables = ['feed_likes', 'forum_reactions'];
  const results = {};

  for (const table of tables) {
    console.log(`Testing ${table} table:`);
    console.log('=' . repeat(40));
    
    // Test SELECT
    const { error: selectError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    const canSelect = !selectError;
    console.log(`SELECT: ${canSelect ? '✅ Working' : '❌ Blocked'}`);
    
    // Get test user
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (user) {
      // Get appropriate test ID based on table
      let testId, idField;
      if (table === 'feed_likes') {
        const { data: post } = await supabase
          .from('feed_posts')
          .select('id')
          .limit(1)
          .single();
        testId = post?.id;
        idField = 'post_id';
      } else if (table === 'forum_reactions') {
        const { data: post } = await supabase
          .from('forum_posts')
          .select('id')
          .limit(1)
          .single();
        testId = post?.id;
        idField = 'post_id';
      }
      
      if (testId) {
        // Clean up first
        await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id)
          .eq(idField, testId);
        
        // Test INSERT
        const insertData = {
          user_id: user.id,
          [idField]: testId
        };
        
        if (table === 'forum_reactions') {
          insertData.reaction_type = 'Tee';
        }
        
        const { error: insertError } = await supabase
          .from(table)
          .insert(insertData);
        
        const canInsert = !insertError;
        console.log(`INSERT: ${canInsert ? '✅ Working' : '❌ Blocked: ' + insertError?.message}`);
        
        if (!insertError) {
          // Test DELETE
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id)
            .eq(idField, testId);
          
          const canDelete = !deleteError;
          console.log(`DELETE: ${canDelete ? '✅ Working' : '❌ Blocked'}`);
        }
        
        results[table] = { canSelect, canInsert };
      }
    }
    
    console.log('\n');
  }
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log('=' . repeat(40));
  
  const allWorking = Object.values(results).every(r => r.canSelect && r.canInsert);
  
  if (allWorking) {
    console.log('✅ ALL SYSTEMS WORKING!');
    console.log('Reactions should persist properly now.');
  } else {
    console.log('❌ RLS POLICIES NOT PROPERLY APPLIED\n');
    console.log('The SQL script may not have run completely.\n');
    console.log('🔧 SOLUTION:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run each section of sql/FIX-ALL-REACTIONS-RLS.sql separately:');
    console.log('   - First run the DROP POLICY commands');
    console.log('   - Then run the CREATE POLICY commands');
    console.log('   - Make sure each section shows "Success"');
    console.log('\nAlternatively, try running this simplified version:');
    console.log('For feed_likes:');
    console.log('  CREATE POLICY "feed_likes_insert_v2" ON public.feed_likes');
    console.log('  FOR INSERT WITH CHECK (true);');
    console.log('\nFor forum_reactions:');
    console.log('  CREATE POLICY "forum_reactions_insert_v2" ON public.forum_reactions');
    console.log('  FOR INSERT WITH CHECK (true);');
  }
}

verifyRLSApplied();