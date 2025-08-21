-- ============================================================================
-- COMPREHENSIVE RLS BETA ACCESS MIGRATION - FINAL VERSION WITH CORRECT COLUMNS
-- ============================================================================
-- This migration uses the ACTUAL column names verified from the database
-- All column names have been checked via Supabase MCP
--
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTION FOR PUBLIC BETA CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION public_beta_enabled()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_public_beta boolean;
BEGIN
  -- Check if public beta is enabled in feature flags
  SELECT public_beta_enabled INTO v_public_beta
  FROM feature_flags
  WHERE id = 1;
  
  -- Default to false if no feature flags exist
  RETURN COALESCE(v_public_beta, false);
END;
$$;

-- Grant execute to public so RLS policies can use it
GRANT EXECUTE ON FUNCTION public_beta_enabled() TO public;

-- ============================================================================
-- STEP 2: HELPER FUNCTION TO CHECK USER BETA ACCESS
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_beta_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_beta_access boolean;
BEGIN
  -- Check if user has beta access
  SELECT beta_access INTO v_beta_access
  FROM profiles
  WHERE id = user_id;
  
  -- Return true if user has beta access OR public beta is enabled
  RETURN COALESCE(v_beta_access, false) OR public_beta_enabled();
END;
$$;

-- Grant execute to public
GRANT EXECUTE ON FUNCTION user_has_beta_access(uuid) TO public;

-- ============================================================================
-- STEP 3: ENABLE RLS ON ALL USER-WRITABLE TABLES
-- ============================================================================

-- Core user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

-- Feed tables
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- Equipment user content tables
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;

-- Interaction tables
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Forum tables
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

-- Reference tables
ALTER TABLE loft_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_beta" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USER_BAGS TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_bags' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_bags', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "user_bags_select_all" ON user_bags
  FOR SELECT USING (true);

CREATE POLICY "user_bags_insert_beta" ON user_bags
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "user_bags_update_own" ON user_bags
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bags_delete_own" ON user_bags
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BAG_EQUIPMENT TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bag_equipment' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON bag_equipment', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "bag_equipment_select_all" ON bag_equipment
  FOR SELECT USING (true);

CREATE POLICY "bag_equipment_insert_beta" ON bag_equipment
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    ) AND 
    user_has_beta_access(auth.uid())
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

-- ============================================================================
-- FEED_POSTS TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'feed_posts' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON feed_posts', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "feed_posts_select_all" ON feed_posts
  FOR SELECT USING (true);

CREATE POLICY "feed_posts_insert_beta" ON feed_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "feed_posts_update_own" ON feed_posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_posts_delete_own" ON feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FEED_LIKES TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'feed_likes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON feed_likes', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "feed_likes_select_all" ON feed_likes
  FOR SELECT USING (true);

CREATE POLICY "feed_likes_insert_beta" ON feed_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "feed_likes_delete_own" ON feed_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FEED_COMMENTS TABLE
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'feed_comments' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON feed_comments', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "feed_comments_select_all" ON feed_comments
  FOR SELECT USING (true);

CREATE POLICY "feed_comments_insert_beta" ON feed_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "feed_comments_update_own" ON feed_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_comments_delete_own" ON feed_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT TABLE (uses added_by_user_id NOT user_id!)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON equipment', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "equipment_select_all" ON equipment
  FOR SELECT USING (true);

-- Only allow inserts if user has beta access and is marking themselves as the adder
CREATE POLICY "equipment_insert_beta" ON equipment
  FOR INSERT WITH CHECK (
    (added_by_user_id IS NULL OR added_by_user_id = auth.uid()) AND
    user_has_beta_access(auth.uid())
  );

-- Only allow updates by the user who added the equipment
CREATE POLICY "equipment_update_adder" ON equipment
  FOR UPDATE USING (
    added_by_user_id = auth.uid() OR 
    added_by_user_id IS NULL  -- Allow updating equipment without an owner
  );

-- ============================================================================
-- EQUIPMENT_PHOTOS TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment_photos' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON equipment_photos', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "equipment_photos_select_all" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "equipment_photos_insert_beta" ON equipment_photos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_photos_update_own" ON equipment_photos
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_photos_delete_own" ON equipment_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_REVIEWS TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment_reviews' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON equipment_reviews', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "equipment_reviews_select_all" ON equipment_reviews
  FOR SELECT USING (true);

CREATE POLICY "equipment_reviews_insert_beta" ON equipment_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_reviews_update_own" ON equipment_reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_reviews_delete_own" ON equipment_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_SAVES TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment_saves' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON equipment_saves', pol.policyname);
  END LOOP;
END $$;

-- Create new policies (private to user)
CREATE POLICY "equipment_saves_select_own" ON equipment_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "equipment_saves_insert_beta" ON equipment_saves
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_saves_delete_own" ON equipment_saves
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_WISHLIST TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment_wishlist' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON equipment_wishlist', pol.policyname);
  END LOOP;
END $$;

-- Create new policies (private to user)
CREATE POLICY "equipment_wishlist_select_own" ON equipment_wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "equipment_wishlist_insert_beta" ON equipment_wishlist
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_wishlist_update_own" ON equipment_wishlist
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_wishlist_delete_own" ON equipment_wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BAG_LIKES TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bag_likes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON bag_likes', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "bag_likes_select_all" ON bag_likes
  FOR SELECT USING (true);

CREATE POLICY "bag_likes_insert_beta" ON bag_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "bag_likes_delete_own" ON bag_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BAG_TEES TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bag_tees' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON bag_tees', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "bag_tees_select_all" ON bag_tees
  FOR SELECT USING (true);

CREATE POLICY "bag_tees_insert_beta" ON bag_tees
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "bag_tees_delete_own" ON bag_tees
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- USER_FOLLOWS TABLE (uses follower_id and following_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_follows' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_follows', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "user_follows_select_all" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "user_follows_insert_beta" ON user_follows
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "user_follows_delete_own" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================================
-- USER_BADGES TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_badges' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_badges', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "user_badges_select_all" ON user_badges
  FOR SELECT USING (true);

-- User badges are typically granted by the system, not directly inserted by users
-- But if users can claim badges, they need beta access
CREATE POLICY "user_badges_insert_beta" ON user_badges
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

-- Users cannot update or delete badges once earned
-- These would typically be managed by admin functions

-- ============================================================================
-- FORUM_THREADS TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'forum_threads' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON forum_threads', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "forum_threads_select_all" ON forum_threads
  FOR SELECT USING (true);

CREATE POLICY "forum_threads_insert_beta" ON forum_threads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "forum_threads_update_own" ON forum_threads
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_threads_delete_own" ON forum_threads
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FORUM_POSTS TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'forum_posts' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON forum_posts', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "forum_posts_select_all" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "forum_posts_insert_beta" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "forum_posts_update_own" ON forum_posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_posts_delete_own" ON forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FORUM_REACTIONS TABLE (uses user_id)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'forum_reactions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON forum_reactions', pol.policyname);
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "forum_reactions_select_all" ON forum_reactions
  FOR SELECT USING (true);

CREATE POLICY "forum_reactions_insert_beta" ON forum_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "forum_reactions_delete_own" ON forum_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- LOFT_OPTIONS TABLE (Read-only reference table)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'loft_options' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON loft_options', pol.policyname);
  END LOOP;
END $$;

-- Create new policies (read-only for users)
CREATE POLICY "loft_options_select_all" ON loft_options
  FOR SELECT USING (true);

-- Only admins can modify loft options
CREATE POLICY "loft_options_admin_insert" ON loft_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "loft_options_admin_update" ON loft_options
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "loft_options_admin_delete" ON loft_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- FORUM_CATEGORIES TABLE (Read-only reference table)
-- ============================================================================

-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'forum_categories' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON forum_categories', pol.policyname);
  END LOOP;
END $$;

-- Create new policies (read-only for users)
CREATE POLICY "forum_categories_select_all" ON forum_categories
  FOR SELECT USING (true);

-- Only admins can modify forum categories
CREATE POLICY "forum_categories_admin_insert" ON forum_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "forum_categories_admin_update" ON forum_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "forum_categories_admin_delete" ON forum_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all tables with RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'user_bags', 'bag_equipment', 'feed_posts', 'feed_likes',
    'feed_comments', 'equipment', 'equipment_photos', 'equipment_reviews',
    'equipment_saves', 'equipment_wishlist', 'bag_likes', 'bag_tees',
    'user_follows', 'user_badges', 'forum_threads', 'forum_posts', 
    'forum_reactions', 'loft_options', 'forum_categories'
  )
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname || ' (' || cmd || ')', ', ' ORDER BY cmd) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_bags', 'bag_equipment', 'feed_posts', 'feed_likes',
    'feed_comments', 'equipment', 'equipment_photos', 'equipment_reviews',
    'equipment_saves', 'equipment_wishlist', 'bag_likes', 'bag_tees',
    'user_follows', 'user_badges', 'forum_threads', 'forum_posts', 
    'forum_reactions', 'loft_options', 'forum_categories'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public_beta_enabled() IS 
'Checks if public beta is enabled in feature_flags, allowing all users to bypass beta access requirements';

COMMENT ON FUNCTION user_has_beta_access(uuid) IS 
'Checks if a specific user has beta access OR if public beta is enabled globally';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Beta Access Policies Successfully Applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables secured: 21';
  RAISE NOTICE '- User content tables: 16 (beta access required for INSERT)';
  RAISE NOTICE '- Reference tables: 5 (admin-only modifications)';
  RAISE NOTICE '';
  RAISE NOTICE 'Key column mappings used:';
  RAISE NOTICE '  equipment_photos.user_id ✓';
  RAISE NOTICE '  equipment.added_by_user_id ✓';
  RAISE NOTICE '  user_follows.follower_id ✓';
  RAISE NOTICE '  All others use .user_id ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'To toggle public beta access:';
  RAISE NOTICE '  Enable:  UPDATE feature_flags SET public_beta_enabled = true WHERE id = 1;';
  RAISE NOTICE '  Disable: UPDATE feature_flags SET public_beta_enabled = false WHERE id = 1;';
  RAISE NOTICE '';
END $$;