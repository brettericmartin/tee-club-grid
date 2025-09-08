-- Migration: Add bag_video type to feed_posts
-- This migration adds support for video posts in the feed

-- Step 1: Drop the existing type constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- Step 2: Add the new constraint with bag_video included
ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN (
  'new_equipment', 
  'bag_update', 
  'milestone', 
  'playing', 
  'equipment_photo',
  'bag_created',
  'bag_updated',
  'multi_equipment_photos',
  'bag_video'  -- New type for bag videos
));

-- Step 3: Create index for bag_video posts for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_posts_bag_video 
ON feed_posts(type, created_at DESC, user_id) 
WHERE type = 'bag_video';

-- Step 4: Add helpful comment
COMMENT ON COLUMN feed_posts.type IS 'Post type - includes bag_video for video content shared from user bags';

-- Migration verification
DO $$
BEGIN
  RAISE NOTICE 'Bag video type migration completed successfully';
  RAISE NOTICE 'Type "bag_video" added to feed_posts allowed types';
  RAISE NOTICE 'Videos with share_to_feed=true will now create feed posts';
END $$;