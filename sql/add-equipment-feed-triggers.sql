-- Add triggers to automatically create feed posts for equipment events

-- 1. Function to create feed post when equipment is added to a bag
CREATE OR REPLACE FUNCTION create_equipment_feed_post()
RETURNS TRIGGER AS $$
BEGIN
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
      NEW.user_id,
      'new_equipment',
      'Added new equipment to bag',
      NEW.equipment_id,
      NEW.bag_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for equipment additions
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;
CREATE TRIGGER create_equipment_feed_post_trigger
AFTER INSERT ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_equipment_feed_post();

-- 3. Function to create feed post when equipment photo is uploaded
CREATE OR REPLACE FUNCTION create_equipment_photo_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_bag_id uuid;
  v_equipment_id uuid;
BEGIN
  -- Get user_id, bag_id, and equipment_id from the bag_equipment record
  SELECT be.user_id, be.bag_id, be.equipment_id 
  INTO v_user_id, v_bag_id, v_equipment_id
  FROM bag_equipment be
  WHERE be.id = NEW.bag_equipment_id;
  
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
    v_equipment_id,
    v_bag_id,
    ARRAY[NEW.photo_url],
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for equipment photo uploads
DROP TRIGGER IF EXISTS create_equipment_photo_feed_post_trigger ON equipment_photos;
CREATE TRIGGER create_equipment_photo_feed_post_trigger
AFTER INSERT ON equipment_photos
FOR EACH ROW
EXECUTE FUNCTION create_equipment_photo_feed_post();

-- 5. Update the bag creation trigger to use the correct feed post type
CREATE OR REPLACE FUNCTION create_bag_feed_post()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the bag creation trigger exists
DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;
CREATE TRIGGER create_bag_feed_post_trigger
AFTER INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION create_bag_feed_post();

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_equipment_id ON feed_posts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_id ON feed_posts(bag_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(type);

-- 7. Ensure feed_posts table has all needed columns
DO $$ 
BEGIN
  -- Add equipment_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'equipment_id'
  ) THEN
    ALTER TABLE feed_posts ADD COLUMN equipment_id uuid REFERENCES equipment(id) ON DELETE SET NULL;
  END IF;
  
  -- Add media_urls if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE feed_posts ADD COLUMN media_urls text[] DEFAULT '{}';
  END IF;
END $$;