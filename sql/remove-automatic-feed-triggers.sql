-- Remove automatic feed post triggers to implement prompt-based system
-- This keeps the functions but removes the automatic triggers

-- 1. Remove trigger for equipment additions
DROP TRIGGER IF EXISTS create_equipment_feed_post_trigger ON bag_equipment;

-- 2. Remove trigger for equipment photo uploads  
DROP TRIGGER IF EXISTS create_equipment_photo_feed_post_trigger ON equipment_photos;

-- 3. Remove trigger for bag creation (optional - you may want to keep this one)
-- DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;

-- Note: We're keeping the trigger functions in case we need them for manual calls
-- The functions are: create_equipment_feed_post(), create_equipment_photo_feed_post(), create_bag_feed_post()