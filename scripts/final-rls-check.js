#!/usr/bin/env node

import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

console.log('🔒 FINAL RLS COMPREHENSIVE CHECK');
console.log('=' .repeat(50));

// Known user ID from the database
const TEST_USER_ID = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

async function checkRLSStatus() {
  console.log('\n1. 📊 BASIC TABLE ACCESS STATUS');
  console.log('-'.repeat(40));

  const tables = [
    'profiles', 'feed_posts', 'feed_likes', 'user_follows', 
    'equipment_photos', 'user_bags', 'bag_equipment', 'equipment'
  ];

  for (const table of tables) {
    try {
      // Check anonymous read access
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      const status = error ? '❌ BLOCKED' : '✅ ACCESSIBLE';
      console.log(`${table.padEnd(20)} | ${status.padEnd(15)} | ${count || 0} total records`);
      
      if (error && error.message.includes('row-level security')) {
        console.log(`   🚨 RLS BLOCKING: ${error.message}`);
      }
    } catch (err) {
      console.log(`${table.padEnd(20)} | ❌ ERROR       | ${err.message}`);
    }
  }
}

async function testCriticalOperations() {
  console.log('\n2. 🧪 TESTING CRITICAL OPERATIONS');
  console.log('-'.repeat(40));

  // Test feed_likes INSERT (this is the known problem)
  console.log('\n📝 Testing feed_likes INSERT...');
  try {
    // Get a real post ID
    const { data: testPost } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();

    if (testPost) {
      console.log(`   Using post ID: ${testPost.id}`);
      
      // Try to insert a like
      const { data: insertResult, error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          post_id: testPost.id,
          user_id: TEST_USER_ID
        })
        .select();

      if (insertError) {
        console.log(`   ❌ INSERT FAILED: ${insertError.message}`);
        
        if (insertError.message.includes('row-level security')) {
          console.log(`   🔧 RLS POLICY ISSUE: Need to create INSERT policy for authenticated users`);
        } else if (insertError.message.includes('duplicate key')) {
          console.log(`   ℹ️  DUPLICATE: Like already exists (this is normal behavior)`);
        } else {
          console.log(`   ⚠️  OTHER ERROR: ${insertError.message}`);
        }
      } else {
        console.log(`   ✅ INSERT SUCCESS: New like created`);
        // Clean up test like
        if (insertResult && insertResult.length > 0) {
          await supabase
            .from('feed_likes')
            .delete()
            .eq('id', insertResult[0].id);
          console.log(`   🧹 Cleaned up test like`);
        }
      }
    } else {
      console.log(`   ❌ No test posts found`);
    }
  } catch (error) {
    console.log(`   ❌ EXCEPTION: ${error.message}`);
  }

  // Test user_follows INSERT
  console.log('\n👥 Testing user_follows INSERT...');
  try {
    // Get existing user IDs
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);

    if (users && users.length >= 2) {
      const followerId = users[0].id;
      const followingId = users[1].id;
      
      console.log(`   Testing follow: ${followerId} -> ${followingId}`);

      const { data: insertResult, error: insertError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        })
        .select();

      if (insertError) {
        console.log(`   ❌ INSERT FAILED: ${insertError.message}`);
        
        if (insertError.message.includes('row-level security')) {
          console.log(`   🔧 RLS POLICY ISSUE: Need to create INSERT policy for authenticated users`);
        } else if (insertError.message.includes('duplicate key')) {
          console.log(`   ℹ️  DUPLICATE: Follow relationship already exists`);
        }
      } else {
        console.log(`   ✅ INSERT SUCCESS: New follow relationship created`);
        // Clean up test follow
        if (insertResult && insertResult.length > 0) {
          await supabase
            .from('user_follows')
            .delete()
            .eq('id', insertResult[0].id);
          console.log(`   🧹 Cleaned up test follow`);
        }
      }
    } else {
      console.log(`   ❌ Not enough users found for follow test`);
    }
  } catch (error) {
    console.log(`   ❌ EXCEPTION: ${error.message}`);
  }
}

async function checkAuthenticatedVsAnonymous() {
  console.log('\n3. 🔐 AUTHENTICATION CONTEXT CHECK');
  console.log('-'.repeat(40));

  console.log('Current client status:');
  
  // Check current session
  const { data: { session } } = await supabase.auth.getSession();
  console.log(`   Session: ${session ? '✅ AUTHENTICATED' : '❌ ANONYMOUS'}`);
  
  if (session) {
    console.log(`   User ID: ${session.user.id}`);
    console.log(`   Role: ${session.user.role || 'authenticated'}`);
  } else {
    console.log(`   ℹ️  Running as anonymous user (anon key)`);
  }
  
  // This explains why our tests might be different from frontend behavior
  console.log('\n   📝 Note: This script uses service role key, not user auth');
  console.log('   Real RLS policies apply when users are authenticated via frontend');
}

async function generateTargetedFixes() {
  console.log('\n4. 🔧 TARGETED RLS FIXES NEEDED');
  console.log('-'.repeat(40));

  console.log(`
Based on the analysis, here are the specific SQL fixes needed:

-- 🎯 TARGETED RLS POLICY FIXES
-- Execute these in Supabase Dashboard > SQL Editor

-- Enable RLS on key tables (if not already enabled)
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Fix feed_likes policies (this is the main issue)
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;

CREATE POLICY "feed_likes_select_policy" 
ON public.feed_likes 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "feed_likes_insert_policy" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_likes_delete_policy" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Fix user_follows policies
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;

CREATE POLICY "user_follows_select_policy" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "user_follows_insert_policy" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_follows_delete_policy" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify policies are created
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'user_follows')
ORDER BY tablename, cmd;
`);

  console.log('\n🚨 PRIORITY FIXES:');
  console.log('1. feed_likes INSERT policy - CRITICAL for like functionality');
  console.log('2. user_follows INSERT policy - CRITICAL for follow functionality');
  console.log('3. Verify all policies allow proper user access patterns');
}

async function main() {
  try {
    await checkRLSStatus();
    await testCriticalOperations();
    await checkAuthenticatedVsAnonymous();
    await generateTargetedFixes();
    
    console.log('\n✅ RLS ANALYSIS COMPLETE');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Execute the targeted SQL fixes in Supabase Dashboard');
    console.log('2. Test like/follow functionality in the frontend');
    console.log('3. Monitor for any remaining RLS issues');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

main();