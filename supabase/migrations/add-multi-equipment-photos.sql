-- Migration: Add support for multi-equipment photo posts
-- This migration adds the new post type and optimizes for multi-photo queries

-- Step 1: Add 'multi_equipment_photos' to the type constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

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
  'multi_equipment_photos'  -- New type for multiple equipment photos
));

-- Step 2: Create specialized indexes for multi-equipment photo posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_posts_multi_equipment 
ON feed_posts(type, created_at DESC, user_id) 
WHERE type = 'multi_equipment_photos';

-- Index for JSONB content queries (for equipment within photos array)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_posts_content_photos 
ON feed_posts USING GIN ((content->'photos')) 
WHERE type = 'multi_equipment_photos';

-- Step 3: Create a function to validate multi-equipment photo posts
CREATE OR REPLACE FUNCTION validate_multi_equipment_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for multi_equipment_photos type
  IF NEW.type = 'multi_equipment_photos' THEN
    -- Ensure content has required structure
    IF NOT (NEW.content ? 'photos' AND jsonb_array_length(NEW.content->'photos') >= 2) THEN
      RAISE EXCEPTION 'Multi-equipment posts must have at least 2 photos';
    END IF;
    
    -- Ensure media_urls array matches photo count
    IF array_length(NEW.media_urls, 1) != jsonb_array_length(NEW.content->'photos') THEN
      RAISE EXCEPTION 'Media URLs count must match photos count';
    END IF;
    
    -- Validate each photo has required fields
    FOR i IN 0..jsonb_array_length(NEW.content->'photos') - 1 LOOP
      IF NOT (
        NEW.content->'photos'->i ? 'url' AND
        NEW.content->'photos'->i ? 'equipment_id' AND
        NEW.content->'photos'->i ? 'equipment_name'
      ) THEN
        RAISE EXCEPTION 'Each photo must have url, equipment_id, and equipment_name';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for validation
DROP TRIGGER IF EXISTS validate_multi_equipment_post_trigger ON feed_posts;
CREATE TRIGGER validate_multi_equipment_post_trigger
BEFORE INSERT OR UPDATE ON feed_posts
FOR EACH ROW
EXECUTE FUNCTION validate_multi_equipment_post();

-- Step 5: Create a view for easy querying of multi-equipment posts
CREATE OR REPLACE VIEW multi_equipment_feed AS
SELECT 
  fp.id,
  fp.user_id,
  fp.created_at,
  fp.likes_count,
  fp.content->>'overall_caption' as caption,
  fp.media_urls,
  jsonb_array_length(fp.content->'photos') as photo_count,
  fp.content->>'equipment_count' as equipment_count,
  fp.content->'photos' as photos,
  p.username,
  p.display_name,
  p.avatar_url
FROM feed_posts fp
JOIN profiles p ON fp.user_id = p.id
WHERE fp.type = 'multi_equipment_photos'
ORDER BY fp.created_at DESC;

-- Step 6: Grant permissions on the view
GRANT SELECT ON multi_equipment_feed TO authenticated;
GRANT SELECT ON multi_equipment_feed TO anon;

-- Step 7: Create a function to automatically create equipment_photos entries
CREATE OR REPLACE FUNCTION create_equipment_photos_from_multi_post()
RETURNS TRIGGER AS $$
DECLARE
  photo JSONB;
  photo_url TEXT;
  equipment_id UUID;
BEGIN
  -- Only process multi_equipment_photos type
  IF NEW.type = 'multi_equipment_photos' THEN
    -- Loop through each photo in the content
    FOR photo IN SELECT * FROM jsonb_array_elements(NEW.content->'photos')
    LOOP
      photo_url := photo->>'url';
      equipment_id := (photo->>'equipment_id')::UUID;
      
      -- Insert into equipment_photos table
      INSERT INTO equipment_photos (
        equipment_id,
        user_id,
        photo_url,
        caption,
        is_primary,
        created_at
      ) VALUES (
        equipment_id,
        NEW.user_id,
        photo_url,
        photo->>'caption',
        false,
        NEW.created_at
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-populate equipment_photos
DROP TRIGGER IF EXISTS create_equipment_photos_trigger ON feed_posts;
CREATE TRIGGER create_equipment_photos_trigger
AFTER INSERT ON feed_posts
FOR EACH ROW
EXECUTE FUNCTION create_equipment_photos_from_multi_post();

-- Step 9: Add helpful comments
COMMENT ON COLUMN feed_posts.type IS 'Post type - multi_equipment_photos allows multiple equipment items in one post';
COMMENT ON INDEX idx_feed_posts_multi_equipment IS 'Optimized index for multi-equipment photo feed queries';

-- Migration verification
DO $$
BEGIN
  RAISE NOTICE 'Multi-equipment photos migration completed successfully';
  RAISE NOTICE 'New type "multi_equipment_photos" added to feed_posts';
  RAISE NOTICE 'Validation triggers and auto-population to equipment_photos table configured';
END $$;