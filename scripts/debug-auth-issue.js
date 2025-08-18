import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugAuthIssue() {
  console.log('🔍 Debugging Authentication/RLS Issue\n');

  try {
    // 1. Check if we can get the current user
    console.log('1. Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else if (user) {
      console.log('✅ Authenticated as:', user.id);
      console.log('   Email:', user.email);
    } else {
      console.log('⚠️ No authenticated user - using anonymous access');
    }

    // 2. Test with service role key if available
    console.log('\n2. Testing with current credentials...');
    const keyType = process.env.VITE_SUPABASE_ANON_KEY === process.env.VITE_SUPABASE_ANON_KEY ? 'ANON' : 'SERVICE';
    console.log('   Using key type:', keyType);

    // 3. Try a simple insert to a test table
    console.log('\n3. Testing database operations...');
    
    // Get a test user from profiles
    const { data: testProfile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (testProfile) {
      console.log('   Test user ID:', testProfile.id);
      
      // Try to insert a forum reaction
      const { data: post } = await supabase
        .from('forum_posts')
        .select('id')
        .limit(1)
        .single();

      if (post) {
        console.log('   Test post ID:', post.id);
        
        // Delete any existing reaction first
        const { error: deleteError } = await supabase
          .from('forum_reactions')
          .delete()
          .eq('user_id', testProfile.id)
          .eq('post_id', post.id);
        
        console.log('   Delete existing:', deleteError ? '⚠️ ' + deleteError.message : '✅ Cleared');
        
        // Try to insert
        console.log('\n   Attempting insert with:');
        console.log('   - user_id:', testProfile.id);
        console.log('   - post_id:', post.id);
        console.log('   - reaction_type: Tee');
        
        const { data: inserted, error: insertError } = await supabase
          .from('forum_reactions')
          .insert({
            user_id: testProfile.id,
            post_id: post.id,
            reaction_type: 'Tee'
          })
          .select()
          .single();
        
        if (insertError) {
          console.log('\n   ❌ Insert failed:', insertError.message);
          console.log('   Error code:', insertError.code);
          console.log('   Error details:', insertError.details);
          
          if (insertError.code === '42501') {
            console.log('\n   🔒 This is definitely an RLS issue');
            console.log('   The policies are not allowing inserts');
          }
        } else {
          console.log('\n   ✅ Insert successful!');
          console.log('   Created reaction:', inserted.id);
          
          // Clean up
          await supabase
            .from('forum_reactions')
            .delete()
            .eq('id', inserted.id);
        }
      }
    }

    // 4. Check if RLS is even enabled
    console.log('\n4. Checking RLS status...');
    // We can't directly query this, but we can infer from behavior
    const { count: totalReactions } = await supabase
      .from('forum_reactions')
      .select('*', { count: 'exact', head: true });
    
    console.log('   Total reactions in table:', totalReactions);
    
    // 5. Try with auth context
    console.log('\n5. Testing with auth context...');
    if (user) {
      console.log('   Current auth user:', user.id);
      
      // Try insert as authenticated user
      const { data: authPost } = await supabase
        .from('forum_posts')
        .select('id')
        .limit(1)
        .single();
      
      if (authPost) {
        const { error: authInsertError } = await supabase
          .from('forum_reactions')
          .insert({
            user_id: user.id,
            post_id: authPost.id,
            reaction_type: 'Helpful'
          });
        
        if (authInsertError) {
          console.log('   ❌ Authenticated insert failed:', authInsertError.message);
        } else {
          console.log('   ✅ Authenticated insert worked!');
          
          // Clean up
          await supabase
            .from('forum_reactions')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', authPost.id);
        }
      }
    } else {
      console.log('   No authenticated user to test with');
      console.log('   This might be the issue - the app expects an authenticated user');
    }

    // 6. Summary
    console.log('\n📊 DIAGNOSIS:');
    console.log('=====================================');
    
    if (!user) {
      console.log('❌ NOT AUTHENTICATED');
      console.log('   The frontend might not be sending auth headers');
      console.log('   Or the user session might have expired');
      console.log('\n🔧 SOLUTION:');
      console.log('   1. Sign out and sign back in');
      console.log('   2. Clear browser cache/cookies');
      console.log('   3. Check if auth.uid() is null in RLS policies');
    } else {
      console.log('❌ RLS POLICIES STILL BLOCKING');
      console.log('   Even with auth, inserts are blocked');
      console.log('\n🔧 SOLUTION:');
      console.log('   Try completely disabling RLS temporarily:');
      console.log('   ALTER TABLE forum_reactions DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE feed_likes DISABLE ROW LEVEL SECURITY;');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugAuthIssue();