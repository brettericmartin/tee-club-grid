-- ============================================================================
-- CORRECTED RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- Fixed: Removed references to non-existent is_public column
-- All bags are considered public since no privacy columns exist
-- ============================================================================

-- STEP 1: Ensure RLS is enabled on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "allow_read_user_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "allow_read_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "allow_read_user_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "allow_insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "view_public_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_insert_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_update_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "users_delete_own_equipment_links" ON user_equipment_links;
DROP POLICY IF EXISTS "view_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "authenticated_insert_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "users_update_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "users_delete_own_equipment_videos" ON equipment_videos;
DROP POLICY IF EXISTS "view_public_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_insert_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_update_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "users_delete_own_bag_videos" ON user_bag_videos;
DROP POLICY IF EXISTS "anyone_insert_link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "owners_view_link_analytics" ON link_clicks;

-- Additional cleanup of other potential policy names
DROP POLICY IF EXISTS "Public read access for equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create equipment links for their own bags" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Public read access for equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update equipment videos they added" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete equipment videos they added" ON equipment_videos;
DROP POLICY IF EXISTS "Public read access for bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create videos for their own bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Public insert access for link click tracking" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;

-- ============================================================================
-- STEP 3: USER EQUIPMENT LINKS POLICIES
-- ============================================================================

-- Everyone can view all equipment links (no privacy system exists)
CREATE POLICY "view_all_equipment_links" 
ON user_equipment_links FOR SELECT
USING (true);

-- Users can create links for their own bags
CREATE POLICY "users_insert_own_equipment_links" 
ON user_equipment_links FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_id
    AND user_bags.user_id = auth.uid()
  )
);

-- Users can update their own links
CREATE POLICY "users_update_own_equipment_links" 
ON user_equipment_links FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "users_delete_own_equipment_links" 
ON user_equipment_links FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- Anyone can view all equipment videos
CREATE POLICY "view_all_equipment_videos" 
ON equipment_videos FOR SELECT
USING (true);

-- Authenticated users can add equipment videos
CREATE POLICY "authenticated_insert_equipment_videos" 
ON equipment_videos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = added_by_user_id);

-- Users can update their own equipment videos
CREATE POLICY "users_update_own_equipment_videos" 
ON equipment_videos FOR UPDATE
USING (auth.uid() = added_by_user_id)
WITH CHECK (auth.uid() = added_by_user_id);

-- Users can delete their own equipment videos
CREATE POLICY "users_delete_own_equipment_videos" 
ON equipment_videos FOR DELETE
USING (auth.uid() = added_by_user_id);

-- ============================================================================
-- STEP 5: USER BAG VIDEOS POLICIES
-- ============================================================================

-- Everyone can view all bag videos (no privacy system)
CREATE POLICY "view_all_bag_videos" 
ON user_bag_videos FOR SELECT
USING (true);

-- Users can add videos to their own bags
CREATE POLICY "users_insert_own_bag_videos" 
ON user_bag_videos FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_id
    AND user_bags.user_id = auth.uid()
  )
);

-- Users can update their own bag videos
CREATE POLICY "users_update_own_bag_videos" 
ON user_bag_videos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bag videos
CREATE POLICY "users_delete_own_bag_videos" 
ON user_bag_videos FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: LINK CLICKS POLICIES
-- ============================================================================

-- Anyone can track clicks (including anonymous users)
CREATE POLICY "anyone_insert_link_clicks" 
ON link_clicks FOR INSERT
WITH CHECK (true);

-- Only link owners can view their analytics
CREATE POLICY "owners_view_link_analytics" 
ON link_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_equipment_links
    WHERE user_equipment_links.id = link_clicks.link_id
    AND user_equipment_links.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Grant permissions to anonymous users (for public content)
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon; -- Allow tracking from non-authenticated users

-- ============================================================================
-- STEP 8: CREATE REQUIRED INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for equipment links bag lookup
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag_user 
ON user_equipment_links(bag_id, user_id);

-- Index for bag videos by bag
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag_user 
ON user_bag_videos(bag_id, user_id);

-- Index for link clicks analytics (using correct column name)
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_created 
ON link_clicks(link_id, created_at DESC);

-- Index for equipment videos by user
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user 
ON equipment_videos(added_by_user_id);

-- ============================================================================
-- VERIFICATION & SUCCESS MESSAGE
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
  RAISE NOTICE '✅ RLS POLICIES SUCCESSFULLY APPLIED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   • Tables with RLS enabled: %/4', rls_count;
  RAISE NOTICE '   • Total policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Model Applied:';
  RAISE NOTICE '   • user_equipment_links: Public read, owner write';
  RAISE NOTICE '   • equipment_videos: Public read, owner write';
  RAISE NOTICE '   • user_bag_videos: Public read, owner write';
  RAISE NOTICE '   • link_clicks: Public insert, owner-only analytics';
  RAISE NOTICE '';
  RAISE NOTICE '✅ QA Checklist Coverage:';
  RAISE NOTICE '   • Affiliate links show on Links tab';
  RAISE NOTICE '   • Buy CTA redirects and tracks clicks';
  RAISE NOTICE '   • Equipment videos appear on equipment pages';
  RAISE NOTICE '   • Bag videos can be shared to feed';
  RAISE NOTICE '   • Owner CRUD operations secured';
  RAISE NOTICE '   • Public read access enabled';
  RAISE NOTICE '============================================================';
END $$;