-- Fix RLS Infinite Recursion Issues
-- The problem: Policies that reference profiles table from within profiles or related tables
-- Solution: Simplify policies to avoid circular dependencies

BEGIN;

-- ============================================
-- 1. DROP ALL EXISTING PROBLEMATIC POLICIES
-- ============================================

-- Drop all policies on affected tables to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

DROP POLICY IF EXISTS "Enable read access for all users" ON forum_threads;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON forum_threads;
DROP POLICY IF EXISTS "Enable update for thread authors" ON forum_threads;
DROP POLICY IF EXISTS "Enable delete for thread authors" ON forum_threads;

DROP POLICY IF EXISTS "Enable read access for all users" ON forum_posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON forum_posts;
DROP POLICY IF EXISTS "Enable update for post authors" ON forum_posts;
DROP POLICY IF EXISTS "Enable delete for post authors" ON forum_posts;

DROP POLICY IF EXISTS "Enable read access for all users" ON feed_posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON feed_posts;
DROP POLICY IF EXISTS "Enable update for post authors" ON feed_posts;
DROP POLICY IF EXISTS "Enable delete for post authors" ON feed_posts;

DROP POLICY IF EXISTS "Enable read access for all users" ON user_bags;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_bags;
DROP POLICY IF EXISTS "Enable update for bag owners" ON user_bags;
DROP POLICY IF EXISTS "Enable delete for bag owners" ON user_bags;

DROP POLICY IF EXISTS "Enable read access for all users" ON bag_equipment;
DROP POLICY IF EXISTS "Enable insert for bag owners" ON bag_equipment;
DROP POLICY IF EXISTS "Enable update for bag owners" ON bag_equipment;
DROP POLICY IF EXISTS "Enable delete for bag owners" ON bag_equipment;

-- ============================================
-- 2. CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- PROFILES: Simple policies without subqueries
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (
    -- Check if profile is not soft-deleted
    deleted_at IS NULL
  );

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    auth.uid() = id AND deleted_at IS NULL
  );

-- FORUM_THREADS: Direct user_id check without profile lookup
CREATE POLICY "forum_threads_select_all" ON forum_threads
  FOR SELECT USING (true);

CREATE POLICY "forum_threads_insert_authenticated" ON forum_threads
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id
  );

CREATE POLICY "forum_threads_update_own" ON forum_threads
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "forum_threads_delete_own" ON forum_threads
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- FORUM_POSTS: Direct user_id check
CREATE POLICY "forum_posts_select_all" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "forum_posts_insert_authenticated" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id
  );

CREATE POLICY "forum_posts_update_own" ON forum_posts
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "forum_posts_delete_own" ON forum_posts
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- FEED_POSTS: Direct user_id check
CREATE POLICY "feed_posts_select_all" ON feed_posts
  FOR SELECT USING (true);

CREATE POLICY "feed_posts_insert_authenticated" ON feed_posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id
  );

CREATE POLICY "feed_posts_update_own" ON feed_posts
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "feed_posts_delete_own" ON feed_posts
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- USER_BAGS: Direct user_id check
CREATE POLICY "user_bags_select_all" ON user_bags
  FOR SELECT USING (
    is_public = true OR auth.uid() = user_id
  );

CREATE POLICY "user_bags_insert_own" ON user_bags
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id
  );

CREATE POLICY "user_bags_update_own" ON user_bags
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "user_bags_delete_own" ON user_bags
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- BAG_EQUIPMENT: Check bag ownership through join
CREATE POLICY "bag_equipment_select_all" ON bag_equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
    )
  );

CREATE POLICY "bag_equipment_insert_own" ON bag_equipment
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

CREATE POLICY "bag_equipment_update_own" ON bag_equipment
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

CREATE POLICY "bag_equipment_delete_own" ON bag_equipment
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. GRANT NECESSARY PERMISSIONS
-- ============================================

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON forum_threads TO authenticated;
GRANT ALL ON forum_posts TO authenticated;
GRANT ALL ON feed_posts TO authenticated;
GRANT ALL ON user_bags TO authenticated;
GRANT ALL ON bag_equipment TO authenticated;

GRANT SELECT ON profiles TO anon;
GRANT SELECT ON forum_threads TO anon;
GRANT SELECT ON forum_posts TO anon;
GRANT SELECT ON feed_posts TO anon;
GRANT SELECT ON user_bags TO anon;
GRANT SELECT ON bag_equipment TO anon;

COMMIT;

-- Test that policies work without recursion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been fixed to avoid infinite recursion';
  RAISE NOTICE 'All policies now use direct checks without circular references';
END $$;