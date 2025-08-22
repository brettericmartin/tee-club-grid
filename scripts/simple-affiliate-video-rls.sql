-- ============================================================================
-- SIMPLE RLS POLICIES FOR AFFILIATE LINKS & VIDEO FEATURES
-- ============================================================================
-- Simplified version with public read, owner write pattern
-- Run this AFTER creating the tables with add-affiliate-video-features.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER EQUIPMENT LINKS POLICIES
-- ============================================================================

-- Public read access
CREATE POLICY "user_equipment_links_select_all" 
  ON user_equipment_links FOR SELECT 
  USING (true);

-- Owner can insert
CREATE POLICY "user_equipment_links_insert_owner" 
  ON user_equipment_links FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Owner can update
CREATE POLICY "user_equipment_links_update_owner" 
  ON user_equipment_links FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can delete
CREATE POLICY "user_equipment_links_delete_owner" 
  ON user_equipment_links FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT VIDEOS POLICIES
-- ============================================================================

-- Public read access
CREATE POLICY "equipment_videos_select_all" 
  ON equipment_videos FOR SELECT 
  USING (true);

-- Authenticated users can insert
CREATE POLICY "equipment_videos_insert_auth" 
  ON equipment_videos FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = added_by_user_id
  );

-- Owner can update
CREATE POLICY "equipment_videos_update_owner" 
  ON equipment_videos FOR UPDATE 
  USING (auth.uid() = added_by_user_id)
  WITH CHECK (auth.uid() = added_by_user_id);

-- Owner can delete
CREATE POLICY "equipment_videos_delete_owner" 
  ON equipment_videos FOR DELETE 
  USING (auth.uid() = added_by_user_id);

-- ============================================================================
-- USER BAG VIDEOS POLICIES
-- ============================================================================

-- Public read access
CREATE POLICY "user_bag_videos_select_all" 
  ON user_bag_videos FOR SELECT 
  USING (true);

-- Owner can insert
CREATE POLICY "user_bag_videos_insert_owner" 
  ON user_bag_videos FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Owner can update
CREATE POLICY "user_bag_videos_update_owner" 
  ON user_bag_videos FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can delete
CREATE POLICY "user_bag_videos_delete_owner" 
  ON user_bag_videos FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- LINK CLICKS POLICIES
-- ============================================================================

-- Anyone can insert (for tracking)
CREATE POLICY "link_clicks_insert_all" 
  ON link_clicks FOR INSERT 
  WITH CHECK (true);

-- Only link owners can view their analytics
CREATE POLICY "link_clicks_select_owner" 
  ON link_clicks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links
      WHERE user_equipment_links.id = link_clicks.link_id
      AND user_equipment_links.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for faster RLS lookups
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user_id 
  ON user_equipment_links(user_id);

CREATE INDEX IF NOT EXISTS idx_equipment_videos_added_by 
  ON equipment_videos(added_by_user_id);

CREATE INDEX IF NOT EXISTS idx_user_bag_videos_user_id 
  ON user_bag_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id 
  ON link_clicks(link_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON user_equipment_links TO authenticated;
GRANT ALL ON equipment_videos TO authenticated;
GRANT ALL ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Grant read access to anonymous users
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon;