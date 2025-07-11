-- Fix equipment feed triggers to work with actual table structure

-- 1. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;
DROP TRIGGER IF EXISTS create_equipment_photo_feed_post_trigger ON equipment_photos;
DROP TRIGGER IF EXISTS create_bag_equipment_photo_feed_post_trigger ON bag_equipment;
DROP FUNCTION IF EXISTS create_equipment_feed_post();
DROP FUNCTION IF EXISTS create_equipment_photo_feed_post();
DROP FUNCTION IF EXISTS create_bag_equipment_photo_feed_post();

-- 2. Function to create feed post when equipment is added to a bag
CREATE OR REPLACE FUNCTION create_equipment_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from the bag
  SELECT user_id INTO v_user_id FROM user_bags WHERE id = NEW.bag_id;
  
  -- Only create feed post for new equipment additions (not updates)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      equipment_id,
      bag_id,
      created_at
    ) VALUES (
      v_user_id,
      'equipment_photo',  -- Using equipment_photo type as per feed schema
      'Added new equipment to bag',
      NEW.equipment_id,
      NEW.bag_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger for equipment additions
CREATE TRIGGER create_equipment_feed_post_trigger
AFTER INSERT ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_equipment_feed_post();

-- 4. Function to create feed post when bag equipment photo is updated
CREATE OR REPLACE FUNCTION create_bag_equipment_photo_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only trigger if custom_photo_url changed from NULL to a value
  IF OLD.custom_photo_url IS NULL AND NEW.custom_photo_url IS NOT NULL THEN
    -- Get user_id from the bag
    SELECT user_id INTO v_user_id FROM user_bags WHERE id = NEW.bag_id;
    
    -- Create feed post for the photo
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      equipment_id,
      bag_id,
      media_urls,
      created_at
    ) VALUES (
      v_user_id,
      'equipment_photo',
      'Shared equipment photo',
      NEW.equipment_id,
      NEW.bag_id,
      ARRAY[NEW.custom_photo_url],
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for bag equipment photo updates
CREATE TRIGGER create_bag_equipment_photo_feed_post_trigger
AFTER UPDATE OF custom_photo_url ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_bag_equipment_photo_feed_post();

-- 6. Ensure feed_posts table has necessary columns
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES equipment(id) ON DELETE SET NULL;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- 7. Update bag creation trigger to use correct type
CREATE OR REPLACE FUNCTION create_bag_feed_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a feed post already exists for this bag creation
  IF NOT EXISTS (
    SELECT 1 FROM feed_posts 
    WHERE bag_id = NEW.id 
    AND type = 'bag_created'
    AND user_id = NEW.user_id
  ) THEN
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      bag_id,
      created_at
    ) VALUES (
      NEW.user_id,
      'bag_created',
      'Created a new bag',
      NEW.id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Recreate bag creation trigger
DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;
CREATE TRIGGER create_bag_feed_post_trigger
AFTER INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION create_bag_feed_post();

-- 9. Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_bag_equipment_custom_photo_url ON bag_equipment(custom_photo_url) WHERE custom_photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at_desc ON feed_posts(created_at DESC);

-- 10. Create a function to manually create feed posts for existing equipment with photos
CREATE OR REPLACE FUNCTION backfill_equipment_photo_feed_posts()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Find bag equipment with photos that don't have feed posts
  FOR rec IN 
    SELECT be.*, b.user_id
    FROM bag_equipment be
    JOIN user_bags b ON b.id = be.bag_id
    WHERE be.custom_photo_url IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feed_posts fp 
      WHERE fp.bag_id = be.bag_id 
      AND fp.equipment_id = be.equipment_id
      AND fp.type = 'equipment_photo'
    )
  LOOP
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      equipment_id,
      bag_id,
      media_urls,
      created_at
    ) VALUES (
      rec.user_id,
      'equipment_photo',
      'Shared equipment photo',
      rec.equipment_id,
      rec.bag_id,
      ARRAY[rec.custom_photo_url],
      rec.added_at  -- Use the equipment added_at time
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Optional: Run this to create feed posts for existing equipment photos
-- SELECT backfill_equipment_photo_feed_posts();