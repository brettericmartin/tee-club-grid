-- Fix feed triggers to use the correct data structure expected by frontend

-- 1. Drop existing triggers
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;
DROP TRIGGER IF EXISTS create_bag_equipment_photo_feed_post_trigger ON bag_equipment;
DROP FUNCTION IF EXISTS create_equipment_feed_post();
DROP FUNCTION IF EXISTS create_bag_equipment_photo_feed_post();

-- 2. Function to create feed post when equipment is added to a bag
CREATE OR REPLACE FUNCTION create_equipment_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_bag_name text;
  v_equipment_name text;
BEGIN
  -- Get user_id and bag name
  SELECT u.user_id, u.name 
  INTO v_user_id, v_bag_name 
  FROM user_bags u 
  WHERE u.id = NEW.bag_id;
  
  -- Get equipment name
  SELECT CONCAT(e.brand, ' ', e.model)
  INTO v_equipment_name
  FROM equipment e
  WHERE e.id = NEW.equipment_id;
  
  -- Only create feed post for new equipment additions (not updates)
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
  v_equipment_name text;
BEGIN
  -- Only trigger if custom_photo_url changed from NULL to a value
  IF OLD.custom_photo_url IS NULL AND NEW.custom_photo_url IS NOT NULL THEN
    -- Get user_id from the bag
    SELECT user_id INTO v_user_id FROM user_bags WHERE id = NEW.bag_id;
    
    -- Get equipment name
    SELECT CONCAT(e.brand, ' ', e.model)
    INTO v_equipment_name
    FROM equipment e
    WHERE e.id = NEW.equipment_id;
    
    -- Create feed post for the photo using the structure expected by FeedCard
    INSERT INTO feed_posts (
      user_id,
      type,
      content,
      created_at
    ) VALUES (
      v_user_id,
      'new_equipment',  -- Using new_equipment with is_photo flag
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

-- 5. Trigger for bag equipment photo updates
CREATE TRIGGER create_bag_equipment_photo_feed_post_trigger
AFTER UPDATE OF custom_photo_url ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION create_bag_equipment_photo_feed_post();

-- 6. Fix the bag creation function to use proper content structure
CREATE OR REPLACE FUNCTION create_bag_feed_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a feed post already exists for this bag creation
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

-- 7. Recreate bag creation trigger
DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;
CREATE TRIGGER create_bag_feed_post_trigger
AFTER INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION create_bag_feed_post();