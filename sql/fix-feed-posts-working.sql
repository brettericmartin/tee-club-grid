-- First, let's check what type constraint exists on the feed_posts table
-- Run this query first to see the actual constraint:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'feed_posts'::regclass 
-- AND contype = 'c';

-- Step 1: Add the new columns safely
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES user_bags(id) ON DELETE SET NULL;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_equipment_time 
ON feed_posts(user_id, equipment_id, created_at DESC)
WHERE equipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_id 
ON feed_posts(bag_id)
WHERE bag_id IS NOT NULL;

-- Step 3: Update the type constraint to include 'equipment_photo'
-- First drop the existing constraint
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- Then add the new constraint with all valid types including 'equipment_photo'
ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN ('new_equipment', 'bag_update', 'milestone', 'playing', 'equipment_photo'));

-- Step 4: Migrate existing data from JSONB content to new columns
-- This safely extracts equipment_id and bag_id from existing posts
UPDATE feed_posts 
SET equipment_id = (content->>'equipment_id')::uuid
WHERE content->>'equipment_id' IS NOT NULL 
AND equipment_id IS NULL;

UPDATE feed_posts 
SET bag_id = (content->>'bag_id')::uuid
WHERE content->>'bag_id' IS NOT NULL 
AND bag_id IS NULL;

-- Update media_urls from photo_url in content
UPDATE feed_posts 
SET media_urls = ARRAY[content->>'photo_url']
WHERE content->>'photo_url' IS NOT NULL 
AND media_urls = '{}';

-- Step 5: Verify the migration
-- Check how many posts were updated
SELECT 
  COUNT(*) as total_posts,
  COUNT(equipment_id) as posts_with_equipment,
  COUNT(bag_id) as posts_with_bag,
  COUNT(CASE WHEN array_length(media_urls, 1) > 0 THEN 1 END) as posts_with_media
FROM feed_posts;

-- Check the types being used
SELECT type, COUNT(*) 
FROM feed_posts 
GROUP BY type 
ORDER BY COUNT(*) DESC;