-- Proper RLS Policies Without Recursion
-- Run this AFTER disabling RLS to re-enable with fixed policies
-- Run in Supabase SQL Editor

BEGIN;

-- ============================================
-- STEP 1: Ensure RLS is disabled first (clean slate)
-- ============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies to start fresh
-- ============================================

-- Drop all policies on profiles
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies on forum_threads
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'forum_threads' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON forum_threads', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies on forum_posts
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'forum_posts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON forum_posts', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies on feed_posts
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'feed_posts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON feed_posts', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies on user_bags
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_bags' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_bags', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies on bag_equipment
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'bag_equipment' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bag_equipment', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create SIMPLE, NON-RECURSIVE policies
-- ============================================

-- PROFILES: Simple policies without any subqueries or references
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (true);  -- Everyone can read profiles

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);  -- Users can only insert their own profile

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (auth.uid() = id);  -- Users can only update their own profile

-- FORUM_THREADS: Direct user_id check only
CREATE POLICY "forum_threads_select_policy" ON forum_threads
    FOR SELECT USING (true);  -- Everyone can read threads

CREATE POLICY "forum_threads_insert_policy" ON forum_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);  -- Users can only create threads as themselves

CREATE POLICY "forum_threads_update_policy" ON forum_threads
    FOR UPDATE USING (auth.uid() = user_id);  -- Users can only update their own threads

CREATE POLICY "forum_threads_delete_policy" ON forum_threads
    FOR DELETE USING (auth.uid() = user_id);  -- Users can only delete their own threads

-- FORUM_POSTS: Direct user_id check only
CREATE POLICY "forum_posts_select_policy" ON forum_posts
    FOR SELECT USING (true);  -- Everyone can read posts

CREATE POLICY "forum_posts_insert_policy" ON forum_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);  -- Users can only create posts as themselves

CREATE POLICY "forum_posts_update_policy" ON forum_posts
    FOR UPDATE USING (auth.uid() = user_id);  -- Users can only update their own posts

CREATE POLICY "forum_posts_delete_policy" ON forum_posts
    FOR DELETE USING (auth.uid() = user_id);  -- Users can only delete their own posts

-- FEED_POSTS: Direct user_id check only
CREATE POLICY "feed_posts_select_policy" ON feed_posts
    FOR SELECT USING (true);  -- Everyone can read feed posts

CREATE POLICY "feed_posts_insert_policy" ON feed_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);  -- Users can only create posts as themselves

CREATE POLICY "feed_posts_update_policy" ON feed_posts
    FOR UPDATE USING (auth.uid() = user_id);  -- Users can only update their own posts

CREATE POLICY "feed_posts_delete_policy" ON feed_posts
    FOR DELETE USING (auth.uid() = user_id);  -- Users can only delete their own posts

-- USER_BAGS: Direct user_id check with privacy
CREATE POLICY "user_bags_select_policy" ON user_bags
    FOR SELECT USING (
        is_public = true OR auth.uid() = user_id
    );  -- Public bags or own bags

CREATE POLICY "user_bags_insert_policy" ON user_bags
    FOR INSERT WITH CHECK (auth.uid() = user_id);  -- Users can only create their own bags

CREATE POLICY "user_bags_update_policy" ON user_bags
    FOR UPDATE USING (auth.uid() = user_id);  -- Users can only update their own bags

CREATE POLICY "user_bags_delete_policy" ON user_bags
    FOR DELETE USING (auth.uid() = user_id);  -- Users can only delete their own bags

-- BAG_EQUIPMENT: Check bag ownership via simple join
CREATE POLICY "bag_equipment_select_policy" ON bag_equipment
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
        )
    );

CREATE POLICY "bag_equipment_insert_policy" ON bag_equipment
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "bag_equipment_update_policy" ON bag_equipment
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "bag_equipment_delete_policy" ON bag_equipment
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 4: Re-enable RLS with new policies
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- STEP 5: Verify everything is working
-- ============================================
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts', 'user_bags', 'bag_equipment')
ORDER BY tablename;