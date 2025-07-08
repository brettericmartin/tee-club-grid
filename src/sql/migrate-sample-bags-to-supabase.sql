-- Migration script to populate bags and equipment data in Supabase
-- This script should be run after the schema is set up

-- First, ensure we have some sample profiles (if not already created)
INSERT INTO profiles (id, username, full_name, handicap, location, bio, avatar_url)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'marcus-johnson', 'Marcus Johnson', 0, 'California, USA', 'Professional tournament player', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=200&h=200&fit=crop'),
  ('22222222-2222-2222-2222-222222222222', 'sarah-chen', 'Sarah Chen', 12, 'Texas, USA', 'Weekend warrior and golf enthusiast', 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?w=200&h=200&fit=crop'),
  ('33333333-3333-3333-3333-333333333333', 'mike-rodriguez', 'Mike Rodriguez', 18, 'Florida, USA', 'Budget-conscious golfer', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop'),
  ('44444444-4444-4444-4444-444444444444', 'jennifer-park', 'Jennifer Park', 4, 'New York, USA', 'Serious golfer with premium equipment', 'https://images.unsplash.com/photo-1534180477871-5d6cc81f3920?w=200&h=200&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Create bags for each user (using the new user_bags table)
INSERT INTO user_bags (user_id, name, description, is_public, background_image)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Tour Pro''s Arsenal', 'Professional tournament setup', true, 'midwest-lush'),
  ('22222222-2222-2222-2222-222222222222', 'Weekend Warrior Setup', 'Perfect for weekend rounds', true, 'california-cliffs'),
  ('33333333-3333-3333-3333-333333333333', 'Budget Friendly Build', 'Great value without breaking the bank', true, 'florida-palms'),
  ('44444444-4444-4444-4444-444444444444', 'Premium Performance', 'Top-tier equipment for serious golfers', true, 'arizona-rocks')
ON CONFLICT DO NOTHING;

-- Create sample equipment entries (if not already exists)
-- Note: You should map these to your actual equipment IDs in the database
-- This is just example data

-- For a proper migration:
-- 1. Export your equipment data from the equipment table
-- 2. Map the old equipment IDs (like 'tm-qi10-max') to the new UUID equipment IDs
-- 3. Insert bag_equipment records using the proper equipment IDs

-- Example of how to add equipment to bags (you need to replace with actual equipment IDs):
/*
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  true as is_featured,
  e.msrp as purchase_price,
  'Imported from sample data' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = '11111111-1111-1111-1111-111111111111'
  AND e.brand = 'TaylorMade' 
  AND e.model LIKE '%Qi10%'
LIMIT 6;
*/

-- Create some bag likes for popular bags
INSERT INTO bag_likes (user_id, bag_id)
SELECT 
  p.id as user_id,
  b.id as bag_id
FROM profiles p
CROSS JOIN user_bags b
WHERE p.id != b.user_id
  AND RANDOM() < 0.3 -- 30% chance of liking
ON CONFLICT DO NOTHING;

-- Create some follows between users
INSERT INTO user_follows (follower_id, following_id)
SELECT DISTINCT
  p1.id as follower_id,
  p2.id as following_id
FROM profiles p1
CROSS JOIN profiles p2
WHERE p1.id != p2.id
  AND RANDOM() < 0.25 -- 25% chance of following
ON CONFLICT DO NOTHING;