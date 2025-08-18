import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function quickTest() {
  console.log('🏌️ Quick Likes Test\n');
  
  // Get a user and post
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
  const { data: post } = await supabase.from('feed_posts').select('id, likes_count').limit(1).single();
  
  if (!user || !post) {
    console.log('❌ No test data');
    return;
  }
  
  console.log(`Testing with user ${user.id.substring(0, 8)}... and post ${post.id.substring(0, 8)}...`);
  console.log(`Post currently has ${post.likes_count || 0} likes\n`);
  
  // Remove any existing like
  await supabase.from('feed_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
  
  // Try to add a like
  console.log('Attempting to add a like...');
  const { error: likeError } = await supabase
    .from('feed_likes')
    .insert({ user_id: user.id, post_id: post.id });
  
  if (likeError) {
    console.log('❌ CANNOT ADD LIKES - RLS BLOCKING');
    console.log(`   Error: ${likeError.message}`);
    console.log('\n🚨 Likes are NOT working!');
    console.log('   The RLS policies need to be fixed.');
  } else {
    console.log('✅ Like added successfully!');
    
    // Check if count updated
    const { data: updated } = await supabase
      .from('feed_posts')
      .select('likes_count')
      .eq('id', post.id)
      .single();
    
    console.log(`Post now has ${updated?.likes_count || 0} likes`);
    
    // Clean up
    await supabase.from('feed_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
    
    console.log('\n✅ Likes ARE working!');
  }
}

quickTest();