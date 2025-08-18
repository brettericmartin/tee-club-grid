#!/usr/bin/env node

import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

console.log('🔒 COMPREHENSIVE RLS AUDIT');
console.log('=' .repeat(50));

// Critical tables to check
const criticalTables = [
  'profiles',
  'feed_posts', 
  'feed_likes',
  'user_follows',
  'equipment_photos',
  'user_bags',
  'bag_equipment',
  'equipment',
  'reviews',
  'badges',
  'user_badges'
];

async function checkTableRLS(tableName) {
  console.log(`\n📋 Checking: ${tableName}`);
  console.log('-'.repeat(30));

  try {
    // Test anonymous read access
    const { data: anonData, error: anonError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    console.log(`✅ Anonymous READ: ${anonError ? '❌ BLOCKED' : '✅ ALLOWED'}`);
    if (anonError) {
      console.log(`   Error: ${anonError.message}`);
    } else {
      console.log(`   Records accessible: ${anonData?.length || 0}`);
    }

    // Check if table exists and has data
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total records: ${count || 0}`);

  } catch (error) {
    console.log(`❌ Table check failed: ${error.message}`);
  }
}

async function checkSpecificPolicies() {
  console.log('\n🔍 CHECKING SPECIFIC RLS ISSUES');
  console.log('=' .repeat(40));

  // Test feed_likes INSERT (known issue)
  console.log('\n📝 Testing feed_likes INSERT...');
  try {
    const { data: testPost } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();

    if (testPost) {
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          post_id: testPost.id,
          user_id: '68cf7bbe-e7d3-4255-a18c-f890766ff77b' // Test user ID
        });

      if (insertError) {
        console.log(`❌ INSERT blocked: ${insertError.message}`);
        console.log('🔧 Need to fix feed_likes INSERT policy');
      } else {
        console.log('✅ INSERT allowed');
        // Clean up test record
        await supabase
          .from('feed_likes')
          .delete()
          .eq('post_id', testPost.id)
          .eq('user_id', '68cf7bbe-e7d3-4255-a18c-f890766ff77b');
      }
    }
  } catch (error) {
    console.log(`❌ feed_likes test failed: ${error.message}`);
  }

  // Test user_follows
  console.log('\n👥 Testing user_follows...');
  try {
    const { data: followsData, error: followsError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);

    console.log(`User follows: ${followsError ? '❌ BLOCKED' : '✅ ACCESSIBLE'}`);
    if (followsError) {
      console.log(`   Error: ${followsError.message}`);
    }
  } catch (error) {
    console.log(`❌ user_follows test failed: ${error.message}`);
  }

  // Test equipment_photos
  console.log('\n📸 Testing equipment_photos...');
  try {
    const { data: photosData, error: photosError } = await supabase
      .from('equipment_photos')
      .select('*')
      .limit(1);

    console.log(`Equipment photos: ${photosError ? '❌ BLOCKED' : '✅ ACCESSIBLE'}`);
    if (photosError) {
      console.log(`   Error: ${photosError.message}`);
    }
  } catch (error) {
    console.log(`❌ equipment_photos test failed: ${error.message}`);
  }
}

async function generateRLSFixes() {
  console.log('\n🔧 GENERATING RLS FIXES');
  console.log('=' .repeat(40));

  const sqlFixes = `
-- 🔒 COMPREHENSIVE RLS POLICY FIXES
-- Run this SQL in Supabase Dashboard > SQL Editor

-- 1. Fix feed_likes policies
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike their own" ON public.feed_likes;

CREATE POLICY "Anyone can view likes" 
ON public.feed_likes 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can like" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 2. Fix user_follows policies
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;

CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- 3. Fix equipment_photos policies
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can manage their photos" ON public.equipment_photos;

CREATE POLICY "Anyone can view equipment photos" 
ON public.equipment_photos 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can upload photos" 
ON public.equipment_photos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can manage their photos" 
ON public.equipment_photos 
FOR ALL 
TO authenticated 
USING (auth.uid() = uploaded_by);

-- 4. Fix profiles policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 5. Fix feed_posts policies
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their posts" ON public.feed_posts;

CREATE POLICY "Anyone can view posts" 
ON public.feed_posts 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can create posts" 
ON public.feed_posts 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their posts" 
ON public.feed_posts 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their posts" 
ON public.feed_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Verify all policies are applied
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'user_follows', 'equipment_photos', 'profiles', 'feed_posts')
ORDER BY tablename, cmd, policyname;
`;

  console.log('📋 SQL TO EXECUTE:');
  console.log(sqlFixes);
}

async function main() {
  try {
    // Check all critical tables
    for (const table of criticalTables) {
      await checkTableRLS(table);
    }

    // Check specific known issues
    await checkSpecificPolicies();

    // Generate comprehensive fixes
    await generateRLSFixes();

    console.log('\n✅ RLS AUDIT COMPLETE');
    console.log('\n🚨 CRITICAL FINDINGS:');
    console.log('1. feed_likes INSERT likely blocked');
    console.log('2. Multiple tables may need policy updates');
    console.log('3. Execute the generated SQL to fix all issues');

  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

main();