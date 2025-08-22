-- ============================================================================
-- AFFILIATE LINKS & VIDEO FEATURES SCHEMA
-- ============================================================================
-- This migration adds support for:
-- 1. User-owned affiliate/recommended links on bag items
-- 2. Equipment-level videos (curated/UGC)
-- 3. Bag-level recommended videos
-- 4. Link click tracking for analytics
-- ============================================================================

-- 1) USER-OWNED AFFILIATE/RECOMMENDED LINKS FOR BAG ITEMS
-- Users can attach their own affiliate links to equipment in their bags
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_equipment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bag_id UUID NOT NULL REFERENCES user_bags(id) ON DELETE CASCADE,
  bag_equipment_id UUID NOT NULL REFERENCES bag_equipment(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  label TEXT NOT NULL,                 -- e.g. "Buy on Amazon", "My eBay listing"
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,    -- primary CTA button
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique URLs per bag item
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_equipment_links_bagitem_url
  ON user_equipment_links(bag_equipment_id, url);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_equipment_links_bag_equipment
  ON user_equipment_links(bag_equipment_id);

-- 2) EQUIPMENT-LEVEL VIDEOS (appear on general equipment pages)
-- Community-contributed videos about specific equipment
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipment_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube','tiktok','vimeo','other')),
  video_id TEXT,         -- normalized ID when available (youtube/tiktok)
  url TEXT NOT NULL,
  title TEXT,
  channel TEXT,
  thumbnail_url TEXT,    -- cached thumbnail URL
  duration INT,          -- video duration in seconds
  added_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,      -- moderation flag
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique videos per equipment
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_videos_equipment_url
  ON equipment_videos(equipment_id, url);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_equipment_videos_equipment_id
  ON equipment_videos(equipment_id);

-- Index for user's contributed videos
CREATE INDEX IF NOT EXISTS idx_equipment_videos_user_id
  ON equipment_videos(added_by_user_id) WHERE added_by_user_id IS NOT NULL;

-- 3) BAG-LEVEL RECOMMENDED VIDEOS (user curates their own video shelf)
-- Users can add videos to showcase their bag setup, tutorials, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_bag_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bag_id UUID NOT NULL REFERENCES user_bags(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube','tiktok','vimeo','other')),
  video_id TEXT,
  url TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  notes TEXT,                          -- user's description/notes
  share_to_feed BOOLEAN DEFAULT false, -- option to share in activity feed
  sort_order INT DEFAULT 0,             -- for custom ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique videos per bag
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bag_videos_bag_url
  ON user_bag_videos(bag_id, url);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_bag_id 
  ON user_bag_videos(bag_id);

-- Index for feed-shared videos
CREATE INDEX IF NOT EXISTS idx_user_bag_videos_feed 
  ON user_bag_videos(share_to_feed) WHERE share_to_feed = true;

-- 4) LINK CLICK TRACKING (for analytics and revenue tracking)
-- Track clicks on affiliate links for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES user_equipment_links(id) ON DELETE CASCADE,
  clicked_by_user UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bag_id UUID REFERENCES user_bags(id) ON DELETE SET NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_hash TEXT,          -- hashed IP for unique visitor tracking
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id 
  ON link_clicks(link_id);

CREATE INDEX IF NOT EXISTS idx_link_clicks_user_id 
  ON link_clicks(clicked_by_user) WHERE clicked_by_user IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_clicks_created_at 
  ON link_clicks(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- USER EQUIPMENT LINKS POLICIES
-- Users can manage their own links
CREATE POLICY "Users can view all equipment links"
  ON user_equipment_links FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own equipment links"
  ON user_equipment_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipment links"
  ON user_equipment_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipment links"
  ON user_equipment_links FOR DELETE
  USING (auth.uid() = user_id);

-- EQUIPMENT VIDEOS POLICIES
-- Anyone can view, authenticated users can add
CREATE POLICY "Anyone can view equipment videos"
  ON equipment_videos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add equipment videos"
  ON equipment_videos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own equipment videos"
  ON equipment_videos FOR UPDATE
  USING (auth.uid() = added_by_user_id)
  WITH CHECK (auth.uid() = added_by_user_id);

CREATE POLICY "Users can delete their own equipment videos"
  ON equipment_videos FOR DELETE
  USING (auth.uid() = added_by_user_id);

-- USER BAG VIDEOS POLICIES
-- Users can manage their own bag videos
CREATE POLICY "Anyone can view bag videos"
  ON user_bag_videos FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own bag videos"
  ON user_bag_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bag videos"
  ON user_bag_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bag videos"
  ON user_bag_videos FOR DELETE
  USING (auth.uid() = user_id);

-- LINK CLICKS POLICIES
-- Only allow inserts for tracking, no reads for privacy
CREATE POLICY "Anyone can track link clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Only the link owner can view their click analytics
CREATE POLICY "Link owners can view their click analytics"
  ON link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_equipment_links
      WHERE user_equipment_links.id = link_clicks.link_id
      AND user_equipment_links.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to extract video ID from YouTube URL
CREATE OR REPLACE FUNCTION extract_youtube_video_id(url TEXT)
RETURNS TEXT AS $$
DECLARE
  video_id TEXT;
BEGIN
  -- Handle youtu.be URLs
  IF url LIKE '%youtu.be/%' THEN
    video_id := regexp_replace(url, '^.*youtu\.be/([^?&]+).*$', '\1');
  -- Handle youtube.com/watch URLs
  ELSIF url LIKE '%youtube.com/watch%' THEN
    video_id := regexp_replace(url, '^.*[?&]v=([^&]+).*$', '\1');
  -- Handle youtube.com/embed URLs
  ELSIF url LIKE '%youtube.com/embed/%' THEN
    video_id := regexp_replace(url, '^.*youtube\.com/embed/([^?]+).*$', '\1');
  ELSE
    video_id := NULL;
  END IF;
  
  RETURN video_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract video ID from TikTok URL
CREATE OR REPLACE FUNCTION extract_tiktok_video_id(url TEXT)
RETURNS TEXT AS $$
DECLARE
  video_id TEXT;
BEGIN
  -- Handle TikTok video URLs
  IF url LIKE '%tiktok.com%/video/%' THEN
    video_id := regexp_replace(url, '^.*video/([0-9]+).*$', '\1');
  ELSE
    video_id := NULL;
  END IF;
  
  RETURN video_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate video thumbnail URL
CREATE OR REPLACE FUNCTION generate_video_thumbnail(provider TEXT, video_id TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE provider
    WHEN 'youtube' THEN
      RETURN 'https://img.youtube.com/vi/' || video_id || '/mqdefault.jpg';
    WHEN 'vimeo' THEN
      -- Vimeo requires API call, return placeholder
      RETURN NULL;
    WHEN 'tiktok' THEN
      -- TikTok requires API call, return placeholder
      RETURN NULL;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create a generic function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update the updated_at column
CREATE TRIGGER update_user_equipment_links_updated_at
  BEFORE UPDATE ON user_equipment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_videos_updated_at
  BEFORE UPDATE ON equipment_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bag_videos_updated_at
  BEFORE UPDATE ON user_bag_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (commented out for production)
-- ============================================================================

-- INSERT INTO user_equipment_links (user_id, bag_id, bag_equipment_id, equipment_id, label, url, is_primary)
-- VALUES 
--   ('user-uuid', 'bag-uuid', 'bag-equipment-uuid', 'equipment-uuid', 'Buy on Amazon', 'https://amazon.com/...', true),
--   ('user-uuid', 'bag-uuid', 'bag-equipment-uuid', 'equipment-uuid', 'My eBay Listing', 'https://ebay.com/...', false);

-- INSERT INTO equipment_videos (equipment_id, provider, video_id, url, title, channel)
-- VALUES 
--   ('equipment-uuid', 'youtube', 'dQw4w9WgXcQ', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'Equipment Review', 'Golf Channel');

-- INSERT INTO user_bag_videos (user_id, bag_id, provider, video_id, url, title, notes)
-- VALUES 
--   ('user-uuid', 'bag-uuid', 'youtube', 'dQw4w9WgXcQ', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'My Bag Setup', 'Here is how I set up my bag');