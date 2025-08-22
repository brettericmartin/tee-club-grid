-- ============================================================================
-- CORRECTED RLS POLICIES FOR AFFILIATE VIDEO FEATURES
-- ============================================================================
-- This script fixes the RLS policies for the affiliate video tables
-- Based on the actual schema and correct column names
-- ============================================================================

-- First, drop any existing policies that might be incorrect
DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;
DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;

DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;
DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;

DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;

DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;

-- Make sure RLS is enabled on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER EQUIPMENT LINKS POLICIES
-- ============================================================================
-- Schema: id, user_id, bag_id, bag_equipment_id, equipment_id, label, url, 
--         is_primary, sort_order, created_at, updated_at

-- Allow everyone to view equipment links (for displaying on bags)
CREATE POLICY "Public read access for equipment links"
  ON user_equipment_links FOR SELECT
  USING (true);

-- Users can only create links for their own bags
CREATE POLICY "Users can create equipment links for their own bags"
  ON user_equipment_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = user_equipment_links.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only update their own equipment links
CREATE POLICY "Users can update their own equipment links"
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = user_equipment_links.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only delete their own equipment links
CREATE POLICY "Users can delete their own equipment links"
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT VIDEOS POLICIES
-- ============================================================================
-- Schema: id, equipment_id, provider, video_id, url, title, channel,
--         thumbnail_url, duration, added_by_user_id, verified, view_count,
--         created_at, updated_at

-- Allow everyone to view equipment videos
CREATE POLICY "Public read access for equipment videos"
  ON equipment_videos FOR SELECT
  USING (true);

-- Authenticated users can add equipment videos
CREATE POLICY "Authenticated users can add equipment videos"
  ON equipment_videos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND added_by_user_id = auth.uid()
  );

-- Users can only update videos they added
CREATE POLICY "Users can update equipment videos they added"
  ON equipment_videos FOR UPDATE
  USING (auth.uid() = added_by_user_id)
  WITH CHECK (auth.uid() = added_by_user_id);

-- Users can only delete videos they added
CREATE POLICY "Users can delete equipment videos they added"
  ON equipment_videos FOR DELETE
  USING (auth.uid() = added_by_user_id);

-- ============================================================================
-- USER BAG VIDEOS POLICIES
-- ============================================================================
-- Schema: id, user_id, bag_id, provider, video_id, url, title, thumbnail_url,
--         notes, share_to_feed, sort_order, created_at, updated_at

-- Allow everyone to view bag videos (for public bag viewing)
CREATE POLICY "Public read access for bag videos"
  ON user_bag_videos FOR SELECT
  USING (true);

-- Users can only create videos for their own bags
CREATE POLICY "Users can create videos for their own bags"
  ON user_bag_videos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = user_bag_videos.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only update their own bag videos
CREATE POLICY "Users can update their own bag videos"
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = user_bag_videos.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Users can only delete their own bag videos
CREATE POLICY "Users can delete their own bag videos"
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LINK CLICKS POLICIES
-- ============================================================================
-- Schema: id, link_id, clicked_by_user, bag_id, referrer, utm_source,
--         utm_medium, utm_campaign, ip_hash, user_agent, created_at

-- Allow anyone to insert click tracking records (anonymous tracking allowed)
CREATE POLICY "Public insert access for link click tracking"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Only link owners can view their click analytics
CREATE POLICY "Link owners can view their click analytics"
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links
      WHERE user_equipment_links.id = link_clicks.link_id
      AND user_equipment_links.user_id = auth.uid()
    )
  );

-- No update or delete policies for link_clicks (analytics data should be immutable)

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE (if not already exist)
-- ============================================================================

-- These indexes support the RLS policies for better performance
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user_id 
  ON user_equipment_links(user_id);

CREATE INDEX IF NOT EXISTS idx_equipment_videos_added_by_user_id 
  ON equipment_videos(added_by_user_id) WHERE added_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user_id 
  ON user_bag_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_owner 
  ON link_clicks(link_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test that policies are working:
-- SELECT * FROM user_equipment_links; -- Should work (public read)
-- SELECT * FROM equipment_videos;     -- Should work (public read)  
-- SELECT * FROM user_bag_videos;      -- Should work (public read)
-- SELECT * FROM link_clicks;          -- Should fail unless you own links

COMMIT;