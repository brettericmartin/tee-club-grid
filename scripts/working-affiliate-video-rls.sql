-- ============================================================================
-- WORKING RLS POLICIES - VERIFIED WITH ACTUAL DATABASE
-- ============================================================================
-- Uses profiles.is_admin (NOT admins table which doesn't exist)
-- No is_public column (doesn't exist)
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "select_all_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "delete_own_equipment_links" ON user_equipment_links;

DROP POLICY IF EXISTS "select_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "update_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "delete_equipment_videos" ON equipment_videos;

DROP POLICY IF EXISTS "select_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "delete_own_bag_videos" ON user_bag_videos;

DROP POLICY IF EXISTS "insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "select_link_clicks_owner" ON link_clicks;

-- ============================================================================
-- STEP 2: ENABLE RLS
-- ============================================================================

ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: USER EQUIPMENT LINKS POLICIES
-- ============================================================================

-- Public read (no privacy system)
CREATE POLICY "select_all_equipment_links" 
  ON user_equipment_links FOR SELECT
  USING (true);

-- Owner insert
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

-- Owner update
CREATE POLICY "update_own_equipment_links" 
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner delete
CREATE POLICY "delete_own_equipment_links" 
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- View verified or own videos (using profiles.is_admin)
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

-- Authenticated insert
CREATE POLICY "insert_equipment_videos" 
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
    AND (verified = false OR verified IS NULL)
  );

-- Owner/admin update (using profiles.is_admin)
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
      ) THEN true
      WHEN auth.uid() = added_by_user_id THEN 
        (verified = false OR verified IS NULL)
      ELSE false
    END
  );

-- Owner/admin delete (using profiles.is_admin)
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

-- Public read (no privacy system)
CREATE POLICY "select_bag_videos" 
  ON user_bag_videos FOR SELECT
  USING (true);

-- Owner insert
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

-- Owner update
CREATE POLICY "update_own_bag_videos" 
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner delete
CREATE POLICY "delete_own_bag_videos" 
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: LINK CLICKS POLICIES
-- ============================================================================

-- Anyone can track clicks
CREATE POLICY "insert_link_clicks" 
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Owner/admin view (using profiles.is_admin)
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
-- STEP 7: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user ON user_equipment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag ON user_equipment_links(bag_id);
CREATE INDEX IF NOT EXISTS idx_equipment_videos_verified ON equipment_videos(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user ON equipment_videos(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user ON user_bag_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag ON user_bag_videos(bag_id);
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed ON user_bag_videos(share_to_feed) WHERE share_to_feed = true;
CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_user_bags_user ON user_bags(user_id);

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

SELECT 
  'SUCCESS: RLS enabled on ' || COUNT(*) || ' tables' as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
AND c.relrowsecurity = true;