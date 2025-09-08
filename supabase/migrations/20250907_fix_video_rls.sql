-- Fix RLS policies for user_bag_videos table
-- The issue is that users can't insert videos into their own bags

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view videos from public bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can manage videos in their bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can insert videos to their bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON user_bag_videos;

-- Enable RLS on the table
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view videos from their own bags or public/shared bags
CREATE POLICY "Users can view videos from accessible bags"
ON user_bag_videos FOR SELECT
USING (
  -- User owns the video
  auth.uid() = user_id
  OR
  -- Video is shared to feed (public)
  share_to_feed = true
  OR
  -- User owns the bag
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
  OR
  -- Bag is public
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.is_public = true
  )
);

-- Policy 2: Users can insert videos to bags they own
CREATE POLICY "Users can insert videos to their bags"
ON user_bag_videos FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User ID in the video must match authenticated user
  user_id = auth.uid()
  AND
  -- User must own the bag
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Policy 3: Users can update their own videos
CREATE POLICY "Users can update their own videos"
ON user_bag_videos FOR UPDATE
USING (
  -- User owns the video
  user_id = auth.uid()
  AND
  -- User owns the bag
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Can't change ownership
  user_id = auth.uid()
  AND
  -- User still owns the bag
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Policy 4: Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
ON user_bag_videos FOR DELETE
USING (
  -- User owns the video
  user_id = auth.uid()
  AND
  -- User owns the bag
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
GRANT USAGE ON SEQUENCE user_bag_videos_id_seq TO authenticated;