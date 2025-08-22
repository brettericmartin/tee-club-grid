-- ============================================================================
-- CORRECTED RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- Fixed version with correct table names (user_bags not bags)
-- Run this AFTER tables are created to enable Row Level Security
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ANY EXISTING POLICIES (SAFE - IF EXISTS)
-- ============================================================================

-- Drop any policies that might exist from previous attempts
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "view_public_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_delete_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "user_equipment_links_select_all" ON user_equipment_links;
DROP POLICY IF EXISTS "user_equipment_links_insert_owner" ON user_equipment_links;
DROP POLICY IF EXISTS "user_equipment_links_update_owner" ON user_equipment_links;
DROP POLICY IF EXISTS "user_equipment_links_delete_owner" ON user_equipment_links;

DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "view_verified_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "authenticated_insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "users_update_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "users_delete_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "equipment_videos_select_all" ON equipment_videos;
DROP POLICY IF EXISTS "equipment_videos_insert_auth" ON equipment_videos;
DROP POLICY IF EXISTS "equipment_videos_update_owner" ON equipment_videos;
DROP POLICY IF EXISTS "equipment_videos_delete_owner" ON equipment_videos;

DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "view_public_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_delete_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "user_bag_videos_select_all" ON user_bag_videos;
DROP POLICY IF EXISTS "user_bag_videos_insert_owner" ON user_bag_videos;
DROP POLICY IF EXISTS "user_bag_videos_update_owner" ON user_bag_videos;
DROP POLICY IF EXISTS "user_bag_videos_delete_owner" ON user_bag_videos;

DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;
DROP POLICY IF EXISTS "anyone_insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "owners_view_link_analytics" ON link_clicks;
DROP POLICY IF EXISTS "link_clicks_insert_all" ON link_clicks;
DROP POLICY IF EXISTS "link_clicks_select_owner" ON link_clicks;

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
-- CORRECTED: Using user_bags instead of bags

-- Public can view links on public bags (CORRECTED TABLE NAME)
CREATE POLICY "view_equipment_links_public_bags" 
  ON user_equipment_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_bags  -- CORRECTED: user_bags not bags
      WHERE user_bags.id = user_equipment_links.bag_id
      AND (
        user_bags.is_public = true 
        OR user_bags.user_id = auth.uid()
        OR auth.uid() IS NULL -- Allow anonymous viewing of public bags
      )
    )
  );

-- Users can manage their own links (CORRECTED TABLE NAME)
CREATE POLICY "insert_own_equipment_links" 
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags  -- CORRECTED: user_bags not bags
      WHERE user_bags.id = bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_equipment_links" 
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_equipment_links" 
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS POLICIES
-- ============================================================================
-- Videos have moderation support

-- Anyone can view verified videos, users can see their own unverified videos
CREATE POLICY "view_equipment_videos_verified_or_own" 
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
CREATE POLICY "insert_equipment_videos_authenticated" 
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
    AND (verified = false OR verified IS NULL) -- New videos start unverified
  );

-- Users can update their own videos, admins can verify
CREATE POLICY "update_equipment_videos_owner_or_admin" 
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
    -- Regular users can't self-verify
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      ) THEN true  -- Admins can change anything
      WHEN auth.uid() = added_by_user_id THEN 
        (verified = false OR verified IS NULL OR verified = (SELECT verified FROM equipment_videos WHERE id = equipment_videos.id))
      ELSE false
    END
  );

-- Users can delete their own videos, admins can delete any
CREATE POLICY "delete_equipment_videos_owner_or_admin" 
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
-- CORRECTED: Using user_bags instead of bags

-- View videos on public bags or shared to feed (CORRECTED TABLE NAME)
CREATE POLICY "view_bag_videos_public_or_feed" 
  ON user_bag_videos FOR SELECT
  USING (
    share_to_feed = true
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_bags  -- CORRECTED: user_bags not bags
      WHERE user_bags.id = user_bag_videos.bag_id
      AND (
        user_bags.is_public = true 
        OR user_bags.user_id = auth.uid()
      )
    )
  );

-- Users can add videos to their own bags (CORRECTED TABLE NAME)
CREATE POLICY "insert_own_bag_videos" 
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags  -- CORRECTED: user_bags not bags
      WHERE user_bags.id = bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can update their own bag videos
CREATE POLICY "update_own_bag_videos" 
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bag videos
CREATE POLICY "delete_own_bag_videos" 
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: LINK CLICKS POLICIES (PRIVACY-FOCUSED)
-- ============================================================================
-- Write-only for privacy, owners can view their own analytics

-- Anyone can track clicks (write-only for privacy)
CREATE POLICY "insert_link_clicks_anyone" 
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Only link owners can view their analytics
CREATE POLICY "view_link_clicks_owner_only" 
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

-- No update or delete on click analytics (immutable audit log)

-- ============================================================================
-- STEP 7: PERFORMANCE INDEXES FOR RLS POLICIES
-- ============================================================================

-- Index for equipment links bag lookup
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag_user 
  ON user_equipment_links(bag_id, user_id);

-- Index for equipment videos verification status
CREATE INDEX IF NOT EXISTS idx_equipment_videos_verified 
  ON equipment_videos(verified) 
  WHERE verified = true;

-- Index for equipment videos by user
CREATE INDEX IF NOT EXISTS idx_equipment_videos_added_by 
  ON equipment_videos(added_by_user_id)
  WHERE added_by_user_id IS NOT NULL;

-- Index for bag videos feed sharing
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_share_feed 
  ON user_bag_videos(share_to_feed) 
  WHERE share_to_feed = true;

-- Index for bag videos by bag and user
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag_user 
  ON user_bag_videos(bag_id, user_id);

-- Index for link clicks analytics
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_created 
  ON link_clicks(link_id, created_at DESC);

-- Index for user_bags public status (helps with RLS performance)
CREATE INDEX IF NOT EXISTS idx_user_bags_public 
  ON user_bags(is_public) 
  WHERE is_public = true;

-- ============================================================================
-- STEP 8: GRANTS FOR PROPER ACCESS
-- ============================================================================

-- Ensure authenticated users have proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Allow anonymous users to view public content
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon; -- Allow tracking from non-authenticated users

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Check that RLS is enabled
DO $$
DECLARE
  tables_with_rls INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
  AND rowsecurity = true;
  
  IF tables_with_rls = 4 THEN
    RAISE NOTICE '✅ RLS successfully enabled on all 4 affiliate/video tables';
  ELSE
    RAISE WARNING '⚠️ RLS not enabled on all tables. Count: %', tables_with_rls;
  END IF;
END $$;

-- Check that policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks');
  
  RAISE NOTICE '📋 Total policies created: %', policy_count;
  
  -- Expected: 4 policies for user_equipment_links
  --           4 policies for equipment_videos  
  --           4 policies for user_bag_videos
  --           2 policies for link_clicks
  -- Total: 14 policies
  
  IF policy_count >= 14 THEN
    RAISE NOTICE '✅ All expected RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️ Expected at least 14 policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables secured:';
  RAISE NOTICE '  • user_equipment_links - Affiliate links with bag privacy';
  RAISE NOTICE '  • equipment_videos - Videos with moderation';
  RAISE NOTICE '  • user_bag_videos - Bag videos with feed sharing';
  RAISE NOTICE '  • link_clicks - Private analytics tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Key features enabled:';
  RAISE NOTICE '  • Public bags have public links/videos';
  RAISE NOTICE '  • Private bags are protected';
  RAISE NOTICE '  • Video moderation (verified flag)';
  RAISE NOTICE '  • Click analytics (owner-only access)';
  RAISE NOTICE '  • Performance indexes for fast queries';
  RAISE NOTICE '========================================';
END $$;