-- ============================================================================
-- COMPREHENSIVE RLS SETUP FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- Execute this SQL file in your Supabase SQL editor to set up RLS policies
-- for the affiliate links and video features tables.
-- ============================================================================

-- First, enable RLS on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLEAN UP EXISTING POLICIES (IF ANY)
-- ============================================================================

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Anyone can view equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create equipment links for their bags" ON user_equipment_links;

DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;

DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create videos for their own bags" ON user_bag_videos;

DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;
DROP POLICY IF EXISTS "No updates to click records" ON link_clicks;
DROP POLICY IF EXISTS "No deletions of click records" ON link_clicks;

-- ============================================================================
-- USER EQUIPMENT LINKS POLICIES
-- ============================================================================

-- SELECT: Anyone can view equipment links (public for discovery/shopping)
CREATE POLICY "Anyone can view equipment links"
  ON user_equipment_links FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create links for their own bags only
CREATE POLICY "Users can create equipment links for their bags"
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_bags ub 
      WHERE ub.id = bag_id AND ub.user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update their own equipment links
CREATE POLICY "Users can update their own equipment links"
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own equipment links
CREATE POLICY "Users can delete their own equipment links"
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- SELECT: Anyone can view equipment videos (public content)
CREATE POLICY "Anyone can view equipment videos"
  ON equipment_videos FOR SELECT
  USING (true);

-- INSERT: Authenticated users can add equipment videos
CREATE POLICY "Authenticated users can add equipment videos"
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (added_by_user_id IS NULL OR added_by_user_id = auth.uid())
  );

-- UPDATE: Users can update their own videos OR admins can update any
CREATE POLICY "Users can update their own equipment videos"
  ON equipment_videos FOR UPDATE
  USING (
    auth.uid() = added_by_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    auth.uid() = added_by_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- DELETE: Users can delete their own videos OR admins can delete any
CREATE POLICY "Users can delete their own equipment videos"
  ON equipment_videos FOR DELETE
  USING (
    auth.uid() = added_by_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- USER BAG VIDEOS POLICIES
-- ============================================================================

-- SELECT: Anyone can view bag videos (public content)
-- Note: In future, this could respect bag privacy settings
CREATE POLICY "Anyone can view bag videos"
  ON user_bag_videos FOR SELECT
  USING (true);

-- INSERT: Users can create videos for their own bags only
CREATE POLICY "Users can create videos for their own bags"
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_bags ub 
      WHERE ub.id = bag_id AND ub.user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update their own bag videos
CREATE POLICY "Users can update their own bag videos"
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own bag videos
CREATE POLICY "Users can delete their own bag videos"
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LINK CLICKS POLICIES (Analytics & Privacy Protection)
-- ============================================================================

-- INSERT: Anyone can track link clicks (for analytics)
CREATE POLICY "Anyone can track link clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- SELECT: Only link owners can view their click analytics
CREATE POLICY "Link owners can view their click analytics"
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links uel
      WHERE uel.id = link_clicks.link_id
      AND uel.user_id = auth.uid()
    )
  );

-- UPDATE/DELETE: Protect click data integrity - no modifications allowed
CREATE POLICY "No updates to click records"
  ON link_clicks FOR UPDATE
  USING (false);

CREATE POLICY "No deletions of click records"
  ON link_clicks FOR DELETE
  USING (false);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
  AND schemaname = 'public'
ORDER BY tablename;

-- List all policies created for these tables
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
ORDER BY tablename, policyname;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
/*

SECURITY MODEL SUMMARY:
=======================

1. USER_EQUIPMENT_LINKS:
   - Public read access for shopping/discovery
   - Users can only manage links for their own bags
   - Links are tied to specific bag items

2. EQUIPMENT_VIDEOS:
   - Public read access for community content
   - Authenticated users can contribute videos
   - Users can manage their own contributions
   - Admins can moderate any video

3. USER_BAG_VIDEOS:
   - Public read access for showcasing
   - Users can only manage videos for their own bags
   - Could be extended to respect bag privacy settings

4. LINK_CLICKS:
   - Anonymous click tracking for analytics
   - Only link owners can see their metrics
   - Immutable records for data integrity

TESTING:
========
After executing this SQL:
1. Test with authenticated user context
2. Verify unauthorized access is blocked
3. Confirm data operations work as expected
4. Monitor for performance impact

*/