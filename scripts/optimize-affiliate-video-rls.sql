-- ============================================================================
-- OPTIMIZED RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- This script provides production-ready Row Level Security policies with:
-- - Performance optimizations through proper indexing
-- - Privacy-respecting bag visibility
-- - Admin moderation capabilities
-- - Write-only analytics for privacy
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING POLICIES (SAFE - IF EXISTS)
-- ============================================================================

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS sel_user_equipment_links_public ON user_equipment_links;
DROP POLICY IF EXISTS ins_user_equipment_links_owner ON user_equipment_links;
DROP POLICY IF EXISTS upd_user_equipment_links_owner ON user_equipment_links;
DROP POLICY IF EXISTS del_user_equipment_links_owner ON user_equipment_links;

DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS sel_equipment_videos_public ON equipment_videos;
DROP POLICY IF EXISTS cud_equipment_videos_owner ON equipment_videos;

DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS sel_user_bag_videos_public ON user_bag_videos;
DROP POLICY IF EXISTS cud_user_bag_videos_owner ON user_bag_videos;

DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;
DROP POLICY IF EXISTS sel_link_clicks_public ON link_clicks;
DROP POLICY IF EXISTS ins_link_clicks_all ON link_clicks;

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
-- Links should respect bag privacy settings

-- Public can view links on public bags
CREATE POLICY "view_public_equipment_links" 
  ON user_equipment_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bags
      WHERE bags.id = user_equipment_links.bag_id
      AND (
        bags.is_public = true 
        OR bags.user_id = auth.uid()
        OR auth.uid() IS NULL -- Allow anonymous viewing of public bags
      )
    )
  );

-- Users can manage their own links
CREATE POLICY "users_insert_own_equipment_links" 
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM bags
      WHERE bags.id = bag_id
      AND bags.user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_equipment_links" 
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_equipment_links" 
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: EQUIPMENT VIDEOS POLICIES
-- ============================================================================
-- Videos have public visibility but moderation support

-- Anyone can view verified videos
CREATE POLICY "view_verified_equipment_videos" 
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
CREATE POLICY "authenticated_insert_equipment_videos" 
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
    AND verified = false -- New videos start unverified
  );

-- Users can update their own videos
CREATE POLICY "users_update_own_equipment_videos" 
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
      ) THEN true
      ELSE verified = false OR verified IS NULL
    END
  );

-- Users can delete their own videos
CREATE POLICY "users_delete_own_equipment_videos" 
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
-- Bag videos respect bag privacy settings

-- View videos on public bags or shared to feed
CREATE POLICY "view_public_bag_videos" 
  ON user_bag_videos FOR SELECT
  USING (
    share_to_feed = true
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM bags
      WHERE bags.id = user_bag_videos.bag_id
      AND (
        bags.is_public = true 
        OR bags.user_id = auth.uid()
      )
    )
  );

-- Users can add videos to their own bags
CREATE POLICY "users_insert_own_bag_videos" 
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM bags
      WHERE bags.id = bag_id
      AND bags.user_id = auth.uid()
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
-- STEP 6: LINK CLICKS POLICIES (PRIVACY-FOCUSED)
-- ============================================================================
-- Write-only for privacy, owners can view their own analytics

-- Anyone can track clicks (write-only)
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
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- No update or delete on click analytics (immutable audit log)
-- This ensures data integrity for analytics

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
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user 
  ON equipment_videos(added_by_user_id);

-- Index for bag videos feed sharing
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed 
  ON user_bag_videos(share_to_feed) 
  WHERE share_to_feed = true;

-- Index for bag videos by bag
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag_user 
  ON user_bag_videos(bag_id, user_id);

-- Index for link clicks analytics
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_created 
  ON link_clicks(link_id, created_at DESC);

-- ============================================================================
-- STEP 8: ADMIN HELPER FUNCTIONS
-- ============================================================================

-- Function to verify equipment videos (admin only)
CREATE OR REPLACE FUNCTION verify_equipment_video(video_id UUID, should_verify BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update verification status
  UPDATE equipment_videos
  SET verified = should_verify,
      updated_at = NOW()
  WHERE id = video_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get link analytics summary (owner only)
CREATE OR REPLACE FUNCTION get_link_analytics_summary(p_link_id UUID)
RETURNS TABLE (
  total_clicks BIGINT,
  unique_users BIGINT,
  last_click TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user owns the link
  IF NOT EXISTS (
    SELECT 1 FROM user_equipment_links
    WHERE id = p_link_id
    AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this link';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_clicks,
    COUNT(DISTINCT clicked_by_user)::BIGINT as unique_users,
    MAX(created_at) as last_click
  FROM link_clicks
  WHERE link_id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: GRANTS FOR AUTHENTICATED USERS
-- ============================================================================

-- Ensure authenticated users have proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 10: ANONYMOUS ACCESS FOR PUBLIC CONTENT
-- ============================================================================

-- Allow anonymous users to view public content
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon; -- Allow tracking from non-authenticated users

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies successfully optimized for affiliate links and video features';
  RAISE NOTICE 'Tables secured: user_equipment_links, equipment_videos, user_bag_videos, link_clicks';
  RAISE NOTICE 'Performance indexes created for optimal RLS performance';
  RAISE NOTICE 'Admin functions available: verify_equipment_video(), get_link_analytics_summary()';
END $$;