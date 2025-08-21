-- ============================================================================
-- COMPREHENSIVE RLS BETA ACCESS MIGRATION
-- ============================================================================
-- This migration ensures all user-writable tables require beta access
-- or public beta to be enabled for INSERT operations, while maintaining
-- proper ownership restrictions for UPDATE/DELETE operations.
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
-- STEP 3: HELPER FUNCTION TO SAFELY DROP POLICIES
-- ============================================================================

CREATE OR REPLACE FUNCTION drop_policy_if_exists(
  table_name text,
  policy_name text
) RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Policy doesn't exist, that's fine
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: ENABLE RLS ON ALL USER-WRITABLE TABLES
-- ============================================================================

-- Core user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

-- Feed tables
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- Equipment tables
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reports ENABLE ROW LEVEL SECURITY;

-- Interaction tables
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Forum tables
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('profiles', 'profiles_auth_insert_v2');
SELECT drop_policy_if_exists('profiles', 'profiles_auth_update_v2');
SELECT drop_policy_if_exists('profiles', 'profiles_public_select_v2');
SELECT drop_policy_if_exists('profiles', 'public_read');
SELECT drop_policy_if_exists('profiles', 'authenticated_insert');
SELECT drop_policy_if_exists('profiles', 'authenticated_update');

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

-- Drop existing policies
SELECT drop_policy_if_exists('user_bags', 'public_read');
SELECT drop_policy_if_exists('user_bags', 'authenticated_insert');
SELECT drop_policy_if_exists('user_bags', 'authenticated_update');
SELECT drop_policy_if_exists('user_bags', 'authenticated_delete');

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

-- Drop existing policies
SELECT drop_policy_if_exists('bag_equipment', 'public_read');
SELECT drop_policy_if_exists('bag_equipment', 'authenticated_insert');
SELECT drop_policy_if_exists('bag_equipment', 'authenticated_update');
SELECT drop_policy_if_exists('bag_equipment', 'authenticated_delete');

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

-- Drop existing policies
SELECT drop_policy_if_exists('feed_posts', 'feed_posts_auth_insert_v2');
SELECT drop_policy_if_exists('feed_posts', 'feed_posts_auth_update_v2');
SELECT drop_policy_if_exists('feed_posts', 'feed_posts_auth_delete_v2');
SELECT drop_policy_if_exists('feed_posts', 'feed_posts_public_select_v2');

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

-- Drop existing policies
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_auth_insert_v2');
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_auth_delete_v2');
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_public_select_v2');

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

-- Drop existing policies
DO $$ BEGIN
  PERFORM drop_policy_if_exists('feed_comments', 'public_read');
  PERFORM drop_policy_if_exists('feed_comments', 'authenticated_insert');
  PERFORM drop_policy_if_exists('feed_comments', 'authenticated_update');
  PERFORM drop_policy_if_exists('feed_comments', 'authenticated_delete');
END $$;

-- Create new policies (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_comments') THEN
    EXECUTE 'CREATE POLICY "feed_comments_select_all" ON feed_comments FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "feed_comments_insert_beta" ON feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_beta_access(auth.uid()))';
    EXECUTE 'CREATE POLICY "feed_comments_update_own" ON feed_comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "feed_comments_delete_own" ON feed_comments FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- EQUIPMENT TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('equipment', 'public_read');
SELECT drop_policy_if_exists('equipment', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment', 'authenticated_update');

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
-- EQUIPMENT_PHOTOS TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('equipment_photos', 'public_read');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_update');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_delete');

-- Create new policies
CREATE POLICY "equipment_photos_select_all" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "equipment_photos_insert_beta" ON equipment_photos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_photos_update_own" ON equipment_photos
  FOR UPDATE USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "equipment_photos_delete_own" ON equipment_photos
  FOR DELETE USING (auth.uid() = uploaded_by);

-- ============================================================================
-- EQUIPMENT_REVIEWS TABLE
-- ============================================================================

-- Drop existing policies
DO $$ BEGIN
  PERFORM drop_policy_if_exists('equipment_reviews', 'public_read');
  PERFORM drop_policy_if_exists('equipment_reviews', 'authenticated_insert');
  PERFORM drop_policy_if_exists('equipment_reviews', 'authenticated_update');
  PERFORM drop_policy_if_exists('equipment_reviews', 'authenticated_delete');
END $$;

-- Create new policies (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_reviews') THEN
    EXECUTE 'CREATE POLICY "equipment_reviews_select_all" ON equipment_reviews FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "equipment_reviews_insert_beta" ON equipment_reviews FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_beta_access(auth.uid()))';
    EXECUTE 'CREATE POLICY "equipment_reviews_update_own" ON equipment_reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "equipment_reviews_delete_own" ON equipment_reviews FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- EQUIPMENT_SAVES TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('equipment_saves', 'private_to_user');
SELECT drop_policy_if_exists('equipment_saves', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment_saves', 'authenticated_delete');

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
-- EQUIPMENT_WISHLIST TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('equipment_wishlist', 'private_to_user');
SELECT drop_policy_if_exists('equipment_wishlist', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment_wishlist', 'authenticated_update');
SELECT drop_policy_if_exists('equipment_wishlist', 'authenticated_delete');

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
-- EQUIPMENT_REPORTS TABLE (if exists)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_reports') THEN
    -- Drop existing policies
    PERFORM drop_policy_if_exists('equipment_reports', 'authenticated_insert');
    PERFORM drop_policy_if_exists('equipment_reports', 'admin_select');
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "equipment_reports_insert_beta" ON equipment_reports FOR INSERT WITH CHECK (auth.uid() = reported_by AND user_has_beta_access(auth.uid()))';
    
    -- Only admins can view reports
    EXECUTE 'CREATE POLICY "equipment_reports_select_admin" ON equipment_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))';
  END IF;
END $$;

-- ============================================================================
-- BAG_TEES TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('bag_tees', 'public_read');
SELECT drop_policy_if_exists('bag_tees', 'authenticated_insert');
SELECT drop_policy_if_exists('bag_tees', 'authenticated_delete');

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
-- EQUIPMENT_TEES TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('equipment_tees', 'public_read');
SELECT drop_policy_if_exists('equipment_tees', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment_tees', 'authenticated_delete');

-- Create new policies
CREATE POLICY "equipment_tees_select_all" ON equipment_tees
  FOR SELECT USING (true);

CREATE POLICY "equipment_tees_insert_beta" ON equipment_tees
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_has_beta_access(auth.uid())
  );

CREATE POLICY "equipment_tees_delete_own" ON equipment_tees
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- USER_FOLLOWS TABLE
-- ============================================================================

-- Drop existing policies
SELECT drop_policy_if_exists('user_follows', 'user_follows_auth_insert_v2');
SELECT drop_policy_if_exists('user_follows', 'user_follows_auth_delete_v2');
SELECT drop_policy_if_exists('user_follows', 'user_follows_public_select_v2');

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
-- FORUM_THREADS TABLE (if exists)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_threads') THEN
    -- Drop existing policies
    PERFORM drop_policy_if_exists('forum_threads', 'public_read');
    PERFORM drop_policy_if_exists('forum_threads', 'authenticated_insert');
    PERFORM drop_policy_if_exists('forum_threads', 'authenticated_update');
    PERFORM drop_policy_if_exists('forum_threads', 'authenticated_delete');
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "forum_threads_select_all" ON forum_threads FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "forum_threads_insert_beta" ON forum_threads FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_beta_access(auth.uid()))';
    EXECUTE 'CREATE POLICY "forum_threads_update_own" ON forum_threads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "forum_threads_delete_own" ON forum_threads FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- FORUM_POSTS TABLE (if exists)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts') THEN
    -- Drop existing policies
    PERFORM drop_policy_if_exists('forum_posts', 'public_read');
    PERFORM drop_policy_if_exists('forum_posts', 'authenticated_insert');
    PERFORM drop_policy_if_exists('forum_posts', 'authenticated_update');
    PERFORM drop_policy_if_exists('forum_posts', 'authenticated_delete');
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "forum_posts_select_all" ON forum_posts FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "forum_posts_insert_beta" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_beta_access(auth.uid()))';
    EXECUTE 'CREATE POLICY "forum_posts_update_own" ON forum_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "forum_posts_delete_own" ON forum_posts FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- FORUM_REACTIONS TABLE (if exists)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_reactions') THEN
    -- Drop existing policies
    PERFORM drop_policy_if_exists('forum_reactions', 'public_read');
    PERFORM drop_policy_if_exists('forum_reactions', 'authenticated_insert');
    PERFORM drop_policy_if_exists('forum_reactions', 'authenticated_delete');
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "forum_reactions_select_all" ON forum_reactions FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "forum_reactions_insert_beta" ON forum_reactions FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_beta_access(auth.uid()))';
    EXECUTE 'CREATE POLICY "forum_reactions_delete_own" ON forum_reactions FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the helper function (no longer needed after policies are created)
DROP FUNCTION IF EXISTS drop_policy_if_exists(text, text);

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
    'equipment_saves', 'equipment_wishlist', 'bag_tees', 'equipment_tees',
    'user_follows', 'forum_threads', 'forum_posts', 'forum_reactions'
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
    'equipment_saves', 'equipment_wishlist', 'bag_tees', 'equipment_tees',
    'user_follows', 'forum_threads', 'forum_posts', 'forum_reactions'
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