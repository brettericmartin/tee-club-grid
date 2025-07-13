-- SAFE VERSION: This checks for valid foreign keys before updating

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
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;

ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN ('new_equipment', 'bag_update', 'milestone', 'playing', 'equipment_photo'));

-- Step 4: Check which equipment_ids and bag_ids are invalid
SELECT 
  fp.id as post_id,
  fp.content->>'equipment_id' as content_equipment_id,
  e.id IS NOT NULL as equipment_exists,
  fp.content->>'bag_id' as content_bag_id,
  b.id IS NOT NULL as bag_exists
FROM feed_posts fp
LEFT JOIN equipment e ON (fp.content->>'equipment_id')::uuid = e.id
LEFT JOIN user_bags b ON (fp.content->>'bag_id')::uuid = b.id
WHERE 
  fp.content->>'equipment_id' IS NOT NULL 
  OR fp.content->>'bag_id' IS NOT NULL;

-- Step 5: SAFELY migrate only valid data
-- Update equipment_id only where it exists in equipment table
UPDATE feed_posts fp
SET equipment_id = (content->>'equipment_id')::uuid
FROM equipment e
WHERE 
  (fp.content->>'equipment_id')::uuid = e.id
  AND fp.content->>'equipment_id' IS NOT NULL 
  AND fp.equipment_id IS NULL;

-- Update bag_id only where it exists in user_bags table
UPDATE feed_posts fp
SET bag_id = (content->>'bag_id')::uuid
FROM user_bags b
WHERE 
  (fp.content->>'bag_id')::uuid = b.id
  AND fp.content->>'bag_id' IS NOT NULL 
  AND fp.bag_id IS NULL;

-- Update media_urls from photo_url
UPDATE feed_posts 
SET media_urls = ARRAY[content->>'photo_url']
WHERE content->>'photo_url' IS NOT NULL 
AND media_urls = '{}';

-- Step 6: Show results
SELECT 
  COUNT(*) as total_posts,
  COUNT(equipment_id) as posts_with_valid_equipment,
  COUNT(bag_id) as posts_with_valid_bag,
  COUNT(CASE WHEN array_length(media_urls, 1) > 0 THEN 1 END) as posts_with_media
FROM feed_posts;