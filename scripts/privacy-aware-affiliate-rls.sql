-- ============================================================================
-- PRIVACY-AWARE RLS POLICIES (ONLY USE AFTER ADDING is_public COLUMN)
-- ============================================================================
-- Run scripts/add-privacy-columns.sql FIRST
-- Then run this script for privacy-aware RLS
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING POLICIES
-- ============================================================================

DO $$
BEGIN
  -- Drop all existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks') AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: ENABLE RLS
-- ============================================================================

ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: USER EQUIPMENT LINKS WITH PRIVACY
-- ============================================================================

-- Only view links on public bags or own bags
CREATE POLICY "select_equipment_links_privacy_aware" 
  ON user_equipment_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = user_equipment_links.bag_id
      AND (
        user_bags.is_public = true 
        OR user_bags.user_id = auth.uid()
      )
    )
  );

-- Insert only for own bags
CREATE POLICY "insert_own_equipment_links_privacy" 
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Update own links
CREATE POLICY "update_own_equipment_links_privacy" 
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete own links
CREATE POLICY "delete_own_equipment_links_privacy" 
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS (SAME AS BEFORE)
-- ============================================================================

CREATE POLICY "select_equipment_videos_privacy" 
  ON equipment_videos FOR SELECT
  USING (
    verified = true 
    OR added_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "insert_equipment_videos_privacy" 
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
    AND (verified = false OR verified IS NULL)
  );

CREATE POLICY "update_equipment_videos_privacy" 
  ON equipment_videos FOR UPDATE
  USING (
    auth.uid() = added_by_user_id
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  )
  WITH CHECK (
    CASE 
      WHEN EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN true
      WHEN auth.uid() = added_by_user_id THEN 
        (verified = false OR verified IS NULL OR verified = (SELECT verified FROM equipment_videos WHERE id = equipment_videos.id))
      ELSE false
    END
  );

CREATE POLICY "delete_equipment_videos_privacy" 
  ON equipment_videos FOR DELETE
  USING (
    auth.uid() = added_by_user_id
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

-- ============================================================================
-- STEP 5: USER BAG VIDEOS WITH PRIVACY
-- ============================================================================

-- View videos on public bags, shared to feed, or own bags
CREATE POLICY "select_bag_videos_privacy_aware" 
  ON user_bag_videos FOR SELECT
  USING (
    share_to_feed = true
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = user_bag_videos.bag_id
      AND (
        user_bags.is_public = true 
        OR user_bags.user_id = auth.uid()
      )
    )
  );

-- Insert only for own bags
CREATE POLICY "insert_own_bag_videos_privacy" 
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Update own videos
CREATE POLICY "update_own_bag_videos_privacy" 
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete own videos
CREATE POLICY "delete_own_bag_videos_privacy" 
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: LINK CLICKS (SAME AS BEFORE)
-- ============================================================================

CREATE POLICY "insert_link_clicks_privacy" 
  ON link_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "select_link_clicks_owner_privacy" 
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links
      WHERE user_equipment_links.id = link_clicks.link_id
      AND user_equipment_links.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

-- ============================================================================
-- STEP 7: INDEXES
-- ============================================================================

-- All the same indexes as before
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user ON user_equipment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag ON user_equipment_links(bag_id);
CREATE INDEX IF NOT EXISTS idx_equipment_videos_verified ON equipment_videos(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user ON equipment_videos(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user ON user_bag_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag ON user_bag_videos(bag_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed ON user_bag_videos(share_to_feed) WHERE share_to_feed = true;
CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_user_bags_user ON user_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bags_is_public ON user_bags(is_public) WHERE is_public = true;

-- ============================================================================
-- STEP 8: GRANTS
-- ============================================================================

GRANT ALL ON user_equipment_links TO authenticated;
GRANT ALL ON equipment_videos TO authenticated;
GRANT ALL ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✅ PRIVACY-AWARE RLS SETUP COMPLETE';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Privacy Features Enabled:';
  RAISE NOTICE '   • Private bags are hidden from public';
  RAISE NOTICE '   • Links respect bag privacy settings';
  RAISE NOTICE '   • Videos on private bags are private';
  RAISE NOTICE '   • Feed-shared videos remain public';
  RAISE NOTICE '   • Owner always sees their own content';
  RAISE NOTICE '==================================================';
END $$;