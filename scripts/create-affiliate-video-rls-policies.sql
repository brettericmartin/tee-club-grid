-- RLS Policies for Affiliate Links and Video Features
-- This script creates all necessary RLS policies for the new tables

-- Enable RLS on all tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_video_votes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER EQUIPMENT LINKS POLICIES
-- =====================================================

-- View policy: Public can view all links
CREATE POLICY "Anyone can view equipment links"
ON user_equipment_links FOR SELECT
USING (true);

-- Insert policy: Users can create their own links
CREATE POLICY "Users can create their own equipment links"
ON user_equipment_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can update their own links
CREATE POLICY "Users can update their own equipment links"
ON user_equipment_links FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy: Users can delete their own links
CREATE POLICY "Users can delete their own equipment links"
ON user_equipment_links FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- LINK CLICKS POLICIES
-- =====================================================

-- View policy: Link owners can view click data for their links
CREATE POLICY "Link owners can view click analytics"
ON link_clicks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_equipment_links
        WHERE user_equipment_links.id = link_clicks.link_id
        AND user_equipment_links.user_id = auth.uid()
    )
);

-- Insert policy: Anyone can create click records (for tracking)
CREATE POLICY "Anyone can track link clicks"
ON link_clicks FOR INSERT
WITH CHECK (true);

-- No update or delete policies for link_clicks (immutable audit log)

-- =====================================================
-- BAG VIDEOS POLICIES
-- =====================================================

-- View policy: Public can view all bag videos
CREATE POLICY "Anyone can view bag videos"
ON bag_videos FOR SELECT
USING (true);

-- Insert policy: Bag owners can add videos to their bags
CREATE POLICY "Bag owners can add videos to their bags"
ON bag_videos FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_bags
        WHERE user_bags.id = bag_videos.bag_id
        AND user_bags.user_id = auth.uid()
    )
);

-- Update policy: Users can update their own videos
CREATE POLICY "Users can update their own bag videos"
ON bag_videos FOR UPDATE
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Delete policy: Users can delete their own videos
CREATE POLICY "Users can delete their own bag videos"
ON bag_videos FOR DELETE
USING (auth.uid() = added_by);

-- =====================================================
-- EQUIPMENT VIDEOS POLICIES
-- =====================================================

-- View policy: Public can view all equipment videos
CREATE POLICY "Anyone can view equipment videos"
ON equipment_videos FOR SELECT
USING (true);

-- Insert policy: Authenticated users can add equipment videos
CREATE POLICY "Authenticated users can add equipment videos"
ON equipment_videos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = added_by);

-- Update policy: Users can update their own videos or admins can update any
CREATE POLICY "Users can update their own equipment videos"
ON equipment_videos FOR UPDATE
USING (
    auth.uid() = added_by 
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
)
WITH CHECK (
    auth.uid() = added_by 
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Delete policy: Users can delete their own videos or admins can delete any
CREATE POLICY "Users can delete their own equipment videos"
ON equipment_videos FOR DELETE
USING (
    auth.uid() = added_by 
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- =====================================================
-- COMMUNITY VIDEO VOTES POLICIES
-- =====================================================

-- View policy: Public can view vote counts (aggregated)
CREATE POLICY "Anyone can view video votes"
ON community_video_votes FOR SELECT
USING (true);

-- Insert policy: Authenticated users can vote
CREATE POLICY "Authenticated users can vote on videos"
ON community_video_votes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update policy: Users can update their own votes
CREATE POLICY "Users can update their own votes"
ON community_video_votes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy: Users can remove their own votes
CREATE POLICY "Users can delete their own votes"
ON community_video_votes FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- ADDITIONAL SECURITY CONSIDERATIONS
-- =====================================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag_equipment 
ON user_equipment_links(bag_equipment_id);

CREATE INDEX IF NOT EXISTS idx_user_equipment_links_user 
ON user_equipment_links(user_id);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link 
ON link_clicks(link_id);

CREATE INDEX IF NOT EXISTS idx_link_clicks_created 
ON link_clicks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bag_videos_bag 
ON bag_videos(bag_id);

CREATE INDEX IF NOT EXISTS idx_bag_videos_url 
ON bag_videos(url);

CREATE INDEX IF NOT EXISTS idx_equipment_videos_equipment 
ON equipment_videos(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_videos_votes 
ON equipment_videos(vote_count DESC);

CREATE INDEX IF NOT EXISTS idx_community_video_votes_video 
ON community_video_votes(video_id);

CREATE INDEX IF NOT EXISTS idx_community_video_votes_user_video 
ON community_video_votes(user_id, video_id);

-- Grant permissions to authenticated users
GRANT SELECT ON user_equipment_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;

GRANT SELECT, INSERT ON link_clicks TO authenticated;

GRANT SELECT ON bag_videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON bag_videos TO authenticated;

GRANT SELECT ON equipment_videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;

GRANT SELECT ON community_video_votes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON community_video_votes TO authenticated;

-- Grant public read access where appropriate
GRANT SELECT ON user_equipment_links TO anon;
GRANT INSERT ON link_clicks TO anon; -- For tracking clicks from non-authenticated users
GRANT SELECT ON bag_videos TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON community_video_votes TO anon;

COMMENT ON POLICY "Anyone can view equipment links" ON user_equipment_links IS 
'Public visibility of affiliate links to support transparency';

COMMENT ON POLICY "Link owners can view click analytics" ON link_clicks IS 
'Users can only see analytics for their own affiliate links';

COMMENT ON POLICY "Anyone can track link clicks" ON link_clicks IS 
'Allows click tracking from both authenticated and anonymous users';

COMMENT ON POLICY "Bag owners can add videos to their bags" ON bag_videos IS 
'Only bag owners can add videos to their bags';

COMMENT ON POLICY "Authenticated users can add equipment videos" ON equipment_videos IS 
'Community members can contribute equipment videos';