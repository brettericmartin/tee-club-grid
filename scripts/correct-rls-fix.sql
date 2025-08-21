-- CORRECT RLS Fix Based on Actual Schema
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- STEP 1: Disable RLS to clear any bad policies
-- ============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies
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
-- STEP 3: Create CORRECT policies based on actual schema
-- ============================================

-- PROFILES: Simple policies without recursion
-- Check deleted_at column for soft deletes
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (
        deleted_at IS NULL  -- Only show non-deleted profiles
    );

CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE USING (
        auth.uid() = id AND deleted_at IS NULL
    );

-- FORUM_THREADS: Direct user_id check
CREATE POLICY "forum_threads_select" ON forum_threads
    FOR SELECT USING (true);  -- Everyone can read threads

CREATE POLICY "forum_threads_insert" ON forum_threads
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "forum_threads_update" ON forum_threads
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "forum_threads_delete" ON forum_threads
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- FORUM_POSTS: Direct user_id check
CREATE POLICY "forum_posts_select" ON forum_posts
    FOR SELECT USING (true);  -- Everyone can read posts

CREATE POLICY "forum_posts_insert" ON forum_posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "forum_posts_update" ON forum_posts
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "forum_posts_delete" ON forum_posts
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- FEED_POSTS: Direct user_id check
CREATE POLICY "feed_posts_select" ON feed_posts
    FOR SELECT USING (true);  -- Everyone can read feed

CREATE POLICY "feed_posts_insert" ON feed_posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "feed_posts_update" ON feed_posts
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "feed_posts_delete" ON feed_posts
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- USER_BAGS: All bags are viewable (no is_public column)
-- Users can only modify their own bags
CREATE POLICY "user_bags_select" ON user_bags
    FOR SELECT USING (true);  -- All bags are public to read

CREATE POLICY "user_bags_insert" ON user_bags
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "user_bags_update" ON user_bags
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "user_bags_delete" ON user_bags
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- BAG_EQUIPMENT: Can view all, can only modify own
CREATE POLICY "bag_equipment_select" ON bag_equipment
    FOR SELECT USING (true);  -- All equipment is viewable

CREATE POLICY "bag_equipment_insert" ON bag_equipment
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "bag_equipment_update" ON bag_equipment
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "bag_equipment_delete" ON bag_equipment
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 4: Re-enable RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Grant permissions
-- ============================================
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON forum_threads TO authenticated;
GRANT SELECT ON forum_threads TO anon;
GRANT ALL ON forum_posts TO authenticated;
GRANT SELECT ON forum_posts TO anon;
GRANT ALL ON feed_posts TO authenticated;
GRANT SELECT ON feed_posts TO anon;
GRANT ALL ON user_bags TO authenticated;
GRANT SELECT ON user_bags TO anon;
GRANT ALL ON bag_equipment TO authenticated;
GRANT SELECT ON bag_equipment TO anon;

COMMIT;

-- ============================================
-- Verify the fix
-- ============================================
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts', 'user_bags', 'bag_equipment')
ORDER BY tablename;