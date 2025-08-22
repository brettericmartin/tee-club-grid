-- ============================================================================
-- FINAL RLS IMPLEMENTATION FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- Validated against actual database schema
-- Date: 2025-08-22
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================================================

-- Drop policies for user_equipment_links
DROP POLICY IF EXISTS "select_all_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "delete_own_equipment_links" ON user_equipment_links;

-- Drop policies for equipment_videos
DROP POLICY IF EXISTS "select_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "update_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "delete_equipment_videos" ON equipment_videos;

-- Drop policies for user_bag_videos
DROP POLICY IF EXISTS "select_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "delete_own_bag_videos" ON user_bag_videos;

-- Drop policies for link_clicks
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
-- Affiliate links for equipment in user bags

-- Everyone can view all equipment links (public read)
CREATE POLICY "select_all_equipment_links" 
  ON user_equipment_links FOR SELECT
  USING (true);

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
-- Community-sourced videos for equipment with moderation

-- Everyone can view verified videos, users see their own unverified
CREATE POLICY "select_equipment_videos" 
  ON equipment_videos FOR SELECT
  USING (
    verified = true 
    OR added_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Authenticated users can add videos (unverified by default)
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
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
      THEN true  -- Admins can update anything
      WHEN auth.uid() = added_by_user_id 
      THEN (
        -- Users can't verify their own videos
        verified = false 
        OR verified IS NULL 
        OR verified = (
          SELECT verified 
          FROM equipment_videos ev
          WHERE ev.id = equipment_videos.id
        )
      )
      ELSE false
    END
  );

-- Users can delete their own videos, admins can delete any
CREATE POLICY "delete_equipment_videos" 
  ON equipment_videos FOR DELETE
  USING (
    auth.uid() = added_by_user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- STEP 5: USER BAG VIDEOS POLICIES
-- ============================================================================
-- Personal bag showcase videos

-- Everyone can view all bag videos (public read)
CREATE POLICY "select_bag_videos" 
  ON user_bag_videos FOR SELECT
  USING (true);

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
-- Analytics tracking for affiliate links

-- Anyone can insert clicks for tracking (including anonymous)
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
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- STEP 7: PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for user_equipment_links
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user 
  ON user_equipment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag 
  ON user_equipment_links(bag_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_equipment 
  ON user_equipment_links(equipment_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_primary 
  ON user_equipment_links(is_primary) 
  WHERE is_primary = true;

-- Indexes for equipment_videos
CREATE INDEX IF NOT EXISTS idx_equipment_videos_verified 
  ON equipment_videos(verified) 
  WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user 
  ON equipment_videos(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_videos_equipment 
  ON equipment_videos(equipment_id);

-- Indexes for user_bag_videos
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user 
  ON user_bag_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag 
  ON user_bag_videos(bag_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed 
  ON user_bag_videos(share_to_feed) 
  WHERE share_to_feed = true;

-- Indexes for link_clicks
CREATE INDEX IF NOT EXISTS idx_link_clicks_link 
  ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_created_at 
  ON link_clicks(created_at DESC);

-- Supporting indexes for RLS joins
CREATE INDEX IF NOT EXISTS idx_user_bags_user 
  ON user_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_admin 
  ON profiles(is_admin) 
  WHERE is_admin = true;

-- ============================================================================
-- STEP 8: GRANTS FOR ACCESS CONTROL
-- ============================================================================

-- Authenticated users have full access to tables (limited by RLS)
GRANT ALL ON user_equipment_links TO authenticated;
GRANT ALL ON equipment_videos TO authenticated;
GRANT ALL ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Anonymous users have limited access
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon;  -- Allow tracking even for anonymous users

-- Service role has full access (bypasses RLS)
GRANT ALL ON user_equipment_links TO service_role;
GRANT ALL ON equipment_videos TO service_role;
GRANT ALL ON user_bag_videos TO service_role;
GRANT ALL ON link_clicks TO service_role;

-- ============================================================================
-- STEP 9: FINAL VERIFICATION
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
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ RLS IMPLEMENTATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Implementation Status:';
  RAISE NOTICE '   • Tables with RLS enabled: %/4', rls_count;
  RAISE NOTICE '   • Total policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Model:';
  RAISE NOTICE '   • user_equipment_links: Public read, owner write';
  RAISE NOTICE '   • equipment_videos: Verified public, moderated';
  RAISE NOTICE '   • user_bag_videos: Public read, owner write';
  RAISE NOTICE '   • link_clicks: Public insert, owner analytics';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Performance:';
  RAISE NOTICE '   • All tables have optimized indexes';
  RAISE NOTICE '   • RLS policies use efficient joins';
  RAISE NOTICE '   • Admin checks use indexed columns';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Next Steps:';
  RAISE NOTICE '   1. Run verify-rls-implementation.js to test';
  RAISE NOTICE '   2. Test all CRUD operations in the app';
  RAISE NOTICE '   3. Monitor performance with real data';
  RAISE NOTICE '============================================================';
END $$;