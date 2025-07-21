-- Remove equipment addition feed trigger to prevent double posts
-- Only photo uploads should create feed posts

-- Drop the trigger that creates feed posts when equipment is added to a bag
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;
DROP FUNCTION IF EXISTS create_equipment_feed_post() CASCADE;

-- Also drop any other equipment-related feed triggers that might cause duplicates
DROP TRIGGER IF EXISTS create_bag_equipment_feed_post_trigger ON bag_equipment;
DROP FUNCTION IF EXISTS create_bag_equipment_feed_post() CASCADE;

-- Keep only the photo upload trigger (equipment_photos table)
-- This ensures feed posts are only created when visual content is added

-- Verify remaining triggers
DO $$
BEGIN
  RAISE NOTICE 'Remaining triggers on bag_equipment table:';
  FOR r IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bag_equipment'
  LOOP
    RAISE NOTICE '  - %', r.trigger_name;
  END LOOP;
  
  RAISE NOTICE 'Remaining triggers on equipment_photos table:';
  FOR r IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'equipment_photos'
  LOOP
    RAISE NOTICE '  - %', r.trigger_name;
  END LOOP;
END $$;

-- Add comment to document the change
COMMENT ON TABLE feed_posts IS 'Feed posts are now only created when equipment photos are uploaded, not when equipment is added to bags. This prevents duplicate posts.';