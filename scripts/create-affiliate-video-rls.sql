-- ============================================================================
-- RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- This script creates comprehensive RLS policies for:
-- 1. user_equipment_links - User affiliate/recommended links
-- 2. equipment_videos - Equipment-level video content
-- 3. user_bag_videos - User bag video showcases  
-- 4. link_clicks - Click tracking analytics
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY; 
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER EQUIPMENT LINKS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;

-- SELECT: Anyone can view all equipment links (for shopping/discovery)
CREATE POLICY "Anyone can view equipment links"
  ON user_equipment_links FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create links for their own bags
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

-- UPDATE: Users can only update their own links
CREATE POLICY "Users can update their own equipment links"
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own links
CREATE POLICY "Users can delete their own equipment links"
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;

-- SELECT: Anyone can view equipment videos (public content)
CREATE POLICY "Anyone can view equipment videos"
  ON equipment_videos FOR SELECT
  USING (true);

-- INSERT: Authenticated users can add equipment videos
CREATE POLICY "Authenticated users can add equipment videos"
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    added_by_user_id = auth.uid()
  );

-- UPDATE: Users can update their own videos, admins can update any
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

-- DELETE: Users can delete their own videos, admins can delete any
CREATE POLICY "Users can delete their own equipment videos"
  ON equipment_videos FOR DELETE
  USING (
    auth.uid() = added_by_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- USER BAG VIDEOS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;

-- SELECT: Anyone can view bag videos (public content)
-- Note: In future, we may want to respect bag privacy settings
CREATE POLICY "Anyone can view bag videos"
  ON user_bag_videos FOR SELECT
  USING (true);

-- INSERT: Users can create videos for their own bags
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
-- LINK CLICKS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;

-- INSERT: Anyone can track link clicks (for analytics)
CREATE POLICY "Anyone can track link clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- SELECT: Only link owners can view their click analytics
-- This protects user privacy while allowing link owners to see their metrics
CREATE POLICY "Link owners can view their click analytics"
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links uel
      WHERE uel.id = link_clicks.link_id
      AND uel.user_id = auth.uid()
    )
  );

-- UPDATE/DELETE: No one can modify click records (maintain data integrity)
CREATE POLICY "No updates to click records"
  ON link_clicks FOR UPDATE
  USING (false);

CREATE POLICY "No deletions of click records"
  ON link_clicks FOR DELETE
  USING (false);

-- ============================================================================
-- VERIFY POLICIES WERE CREATED
-- ============================================================================

-- Check that RLS is enabled and policies exist
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
  AND schemaname = 'public';

-- List all policies for these tables
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
ORDER BY tablename, policyname;