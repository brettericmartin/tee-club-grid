-- Complete fix for feed system
-- Run this in Supabase SQL editor to fix all feed issues

-- STEP 1: Fix the type constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN (
  'new_equipment',
  'equipment_photo',
  'bag_update',
  'bag_created', 
  'bag_updated',
  'milestone',
  'playing'
));

-- STEP 2: Ensure content column can store JSONB
ALTER TABLE feed_posts 
ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- STEP 3: Drop old triggers
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;
DROP TRIGGER IF EXISTS create_bag_equipment_photo_feed_post_trigger ON bag_equipment;
DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;
DROP FUNCTION IF EXISTS create_equipment_feed_post();
DROP FUNCTION IF EXISTS create_bag_equipment_photo_feed_post();
DROP FUNCTION IF EXISTS create_bag_feed_post();

-- STEP 4: Create function for equipment additions
CREATE OR REPLACE FUNCTION create_equipment_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_bag_name text;
  v_equipment_name text;
BEGIN
  SELECT u.user_id, u.name 
  INTO v_user_id, v_bag_name 
  FROM user_bags u 
  WHERE u.id = NEW.bag_id;
  
  SELECT CONCAT(e.brand, ' ', e.model)
  INTO v_equipment_name
  FROM equipment e
  WHERE e.id = NEW.equipment_id;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      created_at
    ) VALUES (
      v_user_id,
      'new_equipment',
      jsonb_build_object(
        'bag_id', NEW.bag_id,
        'bag_name', v_bag_name,
        'equipment_id', NEW.equipment_id,
        'equipment_name', v_equipment_name,
        'caption', 'Just added ' || v_equipment_name || ' to my ' || v_bag_name || '! Can''t wait to test it out ⛳'
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Create trigger for equipment additions
CREATE TRIGGER create_equipment_feed_post_trigger
AFTER INSERT ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_equipment_feed_post();

-- STEP 6: Create function for equipment photos
CREATE OR REPLACE FUNCTION create_bag_equipment_photo_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_equipment_name text;
BEGIN
  IF OLD.custom_photo_url IS NULL AND NEW.custom_photo_url IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM user_bags WHERE id = NEW.bag_id;
    
    SELECT CONCAT(e.brand, ' ', e.model)
    INTO v_equipment_name
    FROM equipment e
    WHERE e.id = NEW.equipment_id;
    
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      created_at
    ) VALUES (
      v_user_id,
      'new_equipment',
      jsonb_build_object(
        'bag_id', NEW.bag_id,
        'equipment_id', NEW.equipment_id,
        'equipment_name', v_equipment_name,
        'photo_url', NEW.custom_photo_url,
        'is_photo', true,
        'caption', 'Check out my ' || v_equipment_name || '! 📸'
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create trigger for equipment photos
CREATE TRIGGER create_bag_equipment_photo_feed_post_trigger
AFTER UPDATE OF custom_photo_url ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_bag_equipment_photo_feed_post();

-- STEP 8: Create function for bag creation
CREATE OR REPLACE FUNCTION create_bag_feed_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM feed_posts 
    WHERE jsonb_extract_path_text(content, 'bag_id') = NEW.id::text
    AND type = 'bag_update'
    AND jsonb_extract_path_text(content, 'is_creation') = 'true'
    AND user_id = NEW.user_id
  ) THEN
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      created_at
    ) VALUES (
      NEW.user_id,
      'bag_update',
      jsonb_build_object(
        'bag_id', NEW.id,
        'bag_name', 'Created a new bag: ' || NEW.name,
        'caption', 'Just created a new bag setup: ' || NEW.name || '! Check it out 🏌️',
        'is_creation', true
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Create trigger for bag creation
CREATE TRIGGER create_bag_feed_post_trigger
AFTER INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION create_bag_feed_post();

-- STEP 10: Test by showing current feed posts
SELECT 
  id,
  type,
  content,
  created_at
FROM feed_posts
ORDER BY created_at DESC
LIMIT 10;