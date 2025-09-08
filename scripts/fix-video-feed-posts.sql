-- Fix Video Feed Posts - Run this in Supabase SQL Editor
-- This script enables bag_video posts in the feed

-- Step 1: Drop the existing constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- Step 2: Add the updated constraint including bag_video
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
  'bag_video'  -- Added support for video posts
));

-- Step 3: Create performance index for video posts (without CONCURRENTLY for transaction compatibility)
CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_video 
ON feed_posts(type, created_at DESC, user_id) 
WHERE type = 'bag_video';

-- Step 4: Update column comment
COMMENT ON COLUMN feed_posts.type IS 'Post type - includes bag_video for video content shared from user bags';

-- Step 5: Verify the constraint was updated
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'feed_posts' 
  AND c.conname = 'feed_posts_type_check';
  
  IF constraint_def LIKE '%bag_video%' THEN
    RAISE NOTICE '✅ Success! bag_video type is now supported in feed_posts';
  ELSE
    RAISE WARNING '❌ Error: bag_video type was not added to the constraint';
  END IF;
END $$;