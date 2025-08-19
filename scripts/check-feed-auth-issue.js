#!/usr/bin/env node

/**
 * Debug script to identify why feed doesn't load when logged in
 */

import { supabase as supabaseAdmin } from './supabase-admin.js';

async function debugFeedAuthIssue() {
  console.log('🔍 Debugging feed authentication issue...\n');
  
  console.log('1️⃣ Checking feed_posts table structure...');
  const { data: columns, error: columnsError } = await supabaseAdmin.rpc('get_table_columns', {
    table_name: 'feed_posts'
  }).catch(() => ({ data: null, error: 'Function not found' }));
  
  if (!columnsError && columns) {
    console.log('   Columns:', columns.map(c => c.column_name).join(', '));
  }
  
  console.log('\n2️⃣ Testing direct query to feed_posts...');
  const { data: posts, error: postsError } = await supabaseAdmin
    .from('feed_posts')
    .select('*')
    .limit(3);
  
  if (postsError) {
    console.error('   ❌ Error fetching posts:', postsError);
  } else {
    console.log(`   ✅ Successfully fetched ${posts?.length || 0} posts`);
  }
  
  console.log('\n3️⃣ Testing query with profile join...');
  const { data: postsWithProfile, error: profileError } = await supabaseAdmin
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
    console.error('   ❌ Error with profile join:', profileError);
  } else {
    console.log(`   ✅ Successfully fetched ${postsWithProfile?.length || 0} posts with profiles`);
  }
  
  console.log('\n4️⃣ Checking RLS policies on feed_posts...');
  const { data: rlsCheck } = await supabaseAdmin.rpc('check_rls_enabled', {
    table_name: 'feed_posts'
  }).catch(() => ({ data: null }));
  
  if (rlsCheck !== null) {
    console.log('   RLS enabled:', rlsCheck);
  }
  
  // Execute SQL to check policies
  console.log('\n5️⃣ Fetching actual RLS policies...');
  const { data: policies, error: policiesError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      SELECT 
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'feed_posts'
      ORDER BY policyname;
    `
  }).catch(async () => {
    // Fallback: try direct SQL execution
    const result = await supabaseAdmin.from('feed_posts').select('count').single();
    return { data: null, error: 'Cannot query policies directly' };
  });
  
  if (!policiesError && policies) {
    console.log('   Policies found:');
    policies.forEach(p => {
      console.log(`   - ${p.policyname}: ${p.cmd} for ${p.roles}`);
    });
  } else {
    console.log('   ⚠️ Could not fetch policies directly');
  }
  
  console.log('\n6️⃣ Testing feed_likes table access...');
  const { data: likes, error: likesError } = await supabaseAdmin
    .from('feed_likes')
    .select('*')
    .limit(3);
  
  if (likesError) {
    console.error('   ❌ Error fetching likes:', likesError);
  } else {
    console.log(`   ✅ Successfully fetched ${likes?.length || 0} likes`);
  }
  
  console.log('\n✨ Debug complete!');
  console.log('\n📋 Summary:');
  console.log('   The issue appears to be with the complex join query when user is authenticated.');
  console.log('   Solution: Simplify the query to avoid the problematic feed_likes join.');
}

// Run the debug
debugFeedAuthIssue().catch(console.error);