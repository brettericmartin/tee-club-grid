#!/usr/bin/env node

/**
 * Simple test to identify the feed loading issue
 */

import { supabase } from './supabase-admin.js';

async function testFeedQueries() {
  console.log('🔍 Testing different feed query variations...\n');
  
  console.log('1️⃣ Simple feed_posts query...');
  const { data: simplePosts, error: simpleError } = await supabase
    .from('feed_posts')
    .select('*')
    .limit(3);
  
  if (simpleError) {
    console.error('   ❌ Error:', simpleError.message);
  } else {
    console.log(`   ✅ Success: ${simplePosts?.length || 0} posts`);
  }
  
  console.log('\n2️⃣ Feed posts with profile join...');
  const { data: postsWithProfile, error: profileError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profile:profiles!feed_posts_user_id_fkey(
        username,
        display_name,
        avatar_url
      )
    `)
    .limit(3);
  
  if (profileError) {
    console.error('   ❌ Error:', profileError.message);
  } else {
    console.log(`   ✅ Success: ${postsWithProfile?.length || 0} posts with profiles`);
  }
  
  console.log('\n3️⃣ Feed posts with LEFT join on profile...');
  const { data: postsWithLeftJoin, error: leftJoinError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profile:profiles!feed_posts_user_id_fkey!left(
        username,
        display_name,
        avatar_url
      )
    `)
    .limit(3);
  
  if (leftJoinError) {
    console.error('   ❌ Error:', leftJoinError.message);
  } else {
    console.log(`   ✅ Success: ${postsWithLeftJoin?.length || 0} posts with left join`);
  }
  
  console.log('\n4️⃣ Feed posts with problematic feed_likes join...');
  const { data: postsWithLikes, error: likesError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profile:profiles!feed_posts_user_id_fkey!left(
        username,
        display_name,
        avatar_url
      ),
      user_liked:feed_likes!feed_likes_post_id_fkey!left(
        id
      )
    `)
    .limit(3);
  
  if (likesError) {
    console.error('   ❌ Error:', likesError.message);
    console.error('   This is likely the problematic query!');
  } else {
    console.log(`   ✅ Success: ${postsWithLikes?.length || 0} posts with likes`);
  }
  
  console.log('\n5️⃣ Checking feed_likes foreign key...');
  // Check if the foreign key exists
  const { data: fkCheck, error: fkError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        confrelid::regclass as referenced_table
      FROM pg_constraint
      WHERE conname = 'feed_likes_post_id_fkey'
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (fkError) {
    console.log('   ⚠️ Could not check foreign key directly');
  } else if (fkCheck && fkCheck.length > 0) {
    console.log('   ✅ Foreign key exists:', fkCheck[0]);
  } else {
    console.log('   ❌ Foreign key feed_likes_post_id_fkey not found!');
  }
  
  console.log('\n✨ Test complete!');
  
  console.log('\n📋 Recommendation:');
  console.log('   Remove the complex feed_likes join from the query.');
  console.log('   Instead, fetch user likes separately after getting posts.');
}

testFeedQueries().catch(console.error);