-- ============================================================================
-- ACTUAL RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES (FIXED)
-- ============================================================================
-- Based on REAL database schema - no is_public column exists!
-- Fixed PL/pgSQL syntax error
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ANY EXISTING POLICIES (FIXED SYNTAX)
-- ============================================================================

-- Drop all existing policies one by one
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "view_public_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "view_equipment_links_public_bags" ON user_equipment_links;
DROP POLICY IF EXISTS "users_insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_delete_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "delete_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "select_all_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "delete_own_equipment_links" ON user_equipment_links;

DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "view_verified_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "view_equipment_videos_verified_or_own" ON equipment_videos;
DROP POLICY IF EXISTS "authenticated_insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "insert_equipment_videos_authenticated" ON equipment_videos;
DROP POLICY IF EXISTS "users_update_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "update_equipment_videos_owner_or_admin" ON equipment_videos;
DROP POLICY IF EXISTS "users_delete_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "delete_equipment_videos_owner_or_admin" ON equipment_videos;
DROP POLICY IF EXISTS "select_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "update_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "delete_equipment_videos" ON equipment_videos;

DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "view_public_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "view_bag_videos_public_or_feed" ON user_bag_videos;
DROP POLICY IF EXISTS "users_insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_delete_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "delete_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "select_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "delete_own_bag_videos" ON user_bag_videos;

DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;
DROP POLICY IF EXISTS "anyone_insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "insert_link_clicks_anyone" ON link_clicks;
DROP POLICY IF EXISTS "owners_view_link_analytics" ON link_clicks;
DROP POLICY IF EXISTS "view_link_clicks_owner_only" ON link_clicks;
DROP POLICY IF EXISTS "insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "select_link_clicks_owner" ON link_clicks;

-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: USER EQUIPMENT LINKS POLICIES
-- ============================================================================
-- Since no privacy columns exist, all bags are effectively public

-- Everyone can view all equipment links (no privacy system exists)
CREATE POLICY "select_all_equipment_links" 
  ON user_equipment_links FOR SELECT
  USING (true);  -- All public since no privacy columns exist

-- Users can only insert links for their own bags
CREATE POLICY "insert_own_equipment_links" 
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = user_equipment_links.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only update their own links
CREATE POLICY "update_own_equipment_links" 
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own links
CREATE POLICY "delete_own_equipment_links" 
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- Everyone can view verified videos, users see their own unverified
CREATE POLICY "select_equipment_videos" 
  ON equipment_videos FOR SELECT
  USING (
    verified = true 
    OR added_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Authenticated users can add videos
CREATE POLICY "insert_equipment_videos" 
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
    AND (verified = false OR verified IS NULL)
  );

-- Users can update their own videos, admins can verify
CREATE POLICY "update_equipment_videos" 
  ON equipment_videos FOR UPDATE
  USING (
    auth.uid() = added_by_user_id
    OR EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    CASE 
      WHEN EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) 
        THEN true
      WHEN auth.uid() = added_by_user_id 
        THEN (verified = false OR verified IS NULL OR verified = (SELECT verified FROM equipment_videos WHERE id = equipment_videos.id))
      ELSE false
    END
  );

-- Users can delete their own videos, admins can delete any
CREATE POLICY "delete_equipment_videos" 
  ON equipment_videos FOR DELETE
  USING (
    auth.uid() = added_by_user_id
    OR EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: USER BAG VIDEOS POLICIES
-- ============================================================================
-- Since no privacy columns exist, visibility is based on share_to_feed only

-- View all videos (no privacy system) or those shared to feed
CREATE POLICY "select_bag_videos" 
  ON user_bag_videos FOR SELECT
  USING (true);  -- All public since no privacy columns exist

-- Users can only add videos to their own bags
CREATE POLICY "insert_own_bag_videos" 
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = user_bag_videos.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only update their own videos
CREATE POLICY "update_own_bag_videos" 
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own videos
CREATE POLICY "delete_own_bag_videos" 
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: LINK CLICKS POLICIES
-- ============================================================================

-- Anyone can insert clicks for tracking
CREATE POLICY "insert_link_clicks" 
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Only link owners and admins can view click analytics
CREATE POLICY "select_link_clicks_owner" 
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links
      WHERE user_equipment_links.id = link_clicks.link_id
      AND user_equipment_links.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: PERFORMANCE INDEXES
-- ============================================================================

-- Core indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user 
  ON user_equipment_links(user_id);

CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag 
  ON user_equipment_links(bag_id);

CREATE INDEX IF NOT EXISTS idx_equipment_videos_verified 
  ON equipment_videos(verified) 
  WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_equipment_videos_user 
  ON equipment_videos(added_by_user_id);

CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user 
  ON user_bag_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag 
  ON user_bag_videos(bag_id);

CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed 
  ON user_bag_videos(share_to_feed) 
  WHERE share_to_feed = true;

CREATE INDEX IF NOT EXISTS idx_link_clicks_link 
  ON link_clicks(link_id);

-- User_bags indexes for RLS joins
CREATE INDEX IF NOT EXISTS idx_user_bags_user 
  ON user_bags(user_id);

-- ============================================================================
-- STEP 8: GRANTS
-- ============================================================================

-- Authenticated users
GRANT ALL ON user_equipment_links TO authenticated;
GRANT ALL ON equipment_videos TO authenticated;
GRANT ALL ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Anonymous users (read-only for public content)
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon;

-- ============================================================================
-- STEP 9: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  rls_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND t.tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
  AND c.relrowsecurity = true;
  
  -- Count policies created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks');
  
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✅ RLS SETUP COMPLETE (ACTUAL SCHEMA VERSION)';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   Tables with RLS enabled: %/4', rls_count;
  RAISE NOTICE '   Policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT NOTES:';
  RAISE NOTICE '   • NO privacy columns exist (no is_public field)';
  RAISE NOTICE '   • All bags are effectively PUBLIC';
  RAISE NOTICE '   • Using admins table for admin checks';
  RAISE NOTICE '   • Videos require verification for public view';
  RAISE NOTICE '   • Link analytics are owner-only';
  RAISE NOTICE '';
  RAISE NOTICE '💡 To add privacy features:';
  RAISE NOTICE '   1. Add is_public column to user_bags table';
  RAISE NOTICE '   2. Update RLS policies to check privacy';
  RAISE NOTICE '==================================================';
END $$;