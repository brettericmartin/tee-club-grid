-- Create Sample Users and Bags
-- Note: These user IDs are examples. In production, users will be created through Auth

-- First, create some sample users in profiles
-- You may need to create these users in Supabase Auth first, then update the IDs here
INSERT INTO profiles (id, username, full_name, handicap, location, bio, avatar_url) VALUES
('d7bed2c5-8c1e-4d7a-b3ea-0e1f7b6a9c8d', 'tiger-woods', 'Tiger Woods', 0.0, 'Florida, USA', '15-time major champion', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=200&h=200&fit=crop'),
('a9fc3d45-7e2b-4c5f-9d1e-3b8f2a6c5e7d', 'rory-mcilroy', 'Rory McIlroy', 0.2, 'Northern Ireland', '4-time major champion', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop'),
('c5d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'lydia-ko', 'Lydia Ko', 0.0, 'New Zealand', 'LPGA Tour champion', 'https://images.unsplash.com/photo-1534180477871-5d6cc81f3920?w=200&h=200&fit=crop'),
('b3a7e5c9-8f2d-4a1b-9c6e-2d5f8e7a3b4c', 'john-amateur', 'John Smith', 12.5, 'California, USA', 'Weekend warrior, love the game!', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'),
('e8f9a0b1-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'sarah-weekend', 'Sarah Johnson', 18.2, 'Texas, USA', 'Just started playing last year', 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?w=200&h=200&fit=crop'),
('f7c8d9e0-3b4a-5c6d-7e8f-9a0b1c2d3e4f', 'mike-scratch', 'Mike Chen', 4.3, 'New York, USA', 'Former college player', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  handicap = EXCLUDED.handicap;

-- Create bags for each user
INSERT INTO user_bags (user_id, name, description, is_public, background_image) VALUES
('d7bed2c5-8c1e-4d7a-b3ea-0e1f7b6a9c8d', 'Tiger''s Tour Setup 2024', 'My current tournament bag setup', true, 'augusta-national'),
('a9fc3d45-7e2b-4c5f-9d1e-3b8f2a6c5e7d', 'Rory''s Power Bag', 'Built for distance and control', true, 'california-cliffs'),
('c5d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Lydia''s Precision Setup', 'Accuracy over everything', true, 'arizona-rocks'),
('b3a7e5c9-8f2d-4a1b-9c6e-2d5f8e7a3b4c', 'My Weekend Bag', 'Budget-friendly but effective', true, 'midwest-lush'),
('e8f9a0b1-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'Sarah''s Starter Set', 'Building my first real bag', true, 'florida-palms'),
('f7c8d9e0-3b4a-5c6d-7e8f-9a0b1c2d3e4f', 'Scratch Golfer Setup', 'Dialed in for scoring', true, 'desert-dunes')
ON CONFLICT DO NOTHING;

-- Add equipment to bags
-- This query will add equipment to each bag based on the equipment we just inserted
-- Tiger's bag - Premium TaylorMade setup
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'irons', 'putter') THEN true 
    ELSE false 
  END as is_featured,
  e.msrp as purchase_price,
  'Tour setup' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'd7bed2c5-8c1e-4d7a-b3ea-0e1f7b6a9c8d'
  AND (
    (e.brand = 'TaylorMade' AND e.model IN ('Qi10', 'Qi10 Fairway', 'P790', 'MG4', 'Spider Tour', 'TP5x'))
    OR (e.brand = 'FootJoy' AND e.model = 'StaSof')
    OR (e.brand = 'TaylorMade' AND e.model = 'FlexTech Carry')
  )
ON CONFLICT DO NOTHING;

-- Rory's bag - Mixed premium setup
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'irons', 'putter') THEN true 
    ELSE false 
  END as is_featured,
  e.msrp as purchase_price,
  'Rory''s specs' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'a9fc3d45-7e2b-4c5f-9d1e-3b8f2a6c5e7d'
  AND (
    (e.brand = 'TaylorMade' AND e.model IN ('Qi10', 'Qi10 Fairway', 'P790'))
    OR (e.brand = 'Titleist' AND e.model IN ('Vokey SM10', 'Pro V1x'))
    OR (e.brand = 'Scotty Cameron' AND e.model = 'Phantom X 5')
    OR (e.brand = 'Titleist' AND e.model = 'Players 4')
  )
ON CONFLICT DO NOTHING;

-- Lydia's bag - Precision setup
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'irons', 'putter') THEN true 
    ELSE false 
  END as is_featured,
  e.msrp as purchase_price,
  'LPGA setup' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'c5d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f'
  AND (
    (e.brand = 'Ping' AND e.model IN ('G430 Max', 'G430 Fairway', 'i230', 'PLD Anser'))
    OR (e.brand = 'Titleist' AND e.model IN ('Vokey SM10', 'Pro V1'))
    OR (e.brand = 'Ping' AND e.model = 'Hoofer 14')
  )
ON CONFLICT DO NOTHING;

-- John's amateur bag - Budget-conscious mix
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'irons', 'putter') THEN true 
    ELSE false 
  END as is_featured,
  ROUND(e.msrp * 0.7, 2) as purchase_price, -- Bought used
  'Great value finds' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'b3a7e5c9-8f2d-4a1b-9c6e-2d5f8e7a3b4c'
  AND (
    (e.brand = 'Ping' AND e.model IN ('G430 Max', 'G430 Fairway', 'G430 Hybrid', 'i230'))
    OR (e.brand = 'Cleveland' AND e.model = 'RTX 6 ZipCore')
    OR (e.brand = 'Odyssey' AND e.model = 'White Hot OG')
    OR (e.brand = 'Wilson' AND e.model = 'Duo Soft')
  )
ON CONFLICT DO NOTHING;

-- Sarah's starter bag - Beginner friendly
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  true as is_featured, -- Feature all clubs for beginners
  ROUND(e.msrp * 0.8, 2) as purchase_price,
  'Starter set' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'e8f9a0b1-2c3d-4e5f-6a7b-8c9d0e1f2a3b'
  AND (
    (e.brand = 'Callaway' AND e.model IN ('AI Smoke Max', 'AI Smoke Fairway', 'Apex Hybrid'))
    OR (e.brand = 'Wilson' AND e.model = 'Duo Soft')
    OR (e.brand = 'Odyssey' AND e.model = 'White Hot OG')
    OR (e.brand = 'Callaway' AND e.model = 'Fairway 14')
  )
  AND e.category != 'accessories' -- Limit clubs for beginner
LIMIT 10
ON CONFLICT DO NOTHING;

-- Mike's scratch golfer bag - Performance setup
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price, notes)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'irons', 'putter', 'wedges') THEN true 
    ELSE false 
  END as is_featured,
  e.msrp as purchase_price,
  'Carefully selected for scoring' as notes
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = 'f7c8d9e0-3b4a-5c6d-7e8f-9a0b1c2d3e4f'
  AND (
    (e.brand = 'Titleist' AND e.model IN ('TSR3', 'TSR3 Fairway', 'T100', 'Vokey SM10', 'Pro V1'))
    OR (e.brand = 'Scotty Cameron' AND e.model = 'Special Select Newport 2')
    OR (e.brand = 'Titleist' AND e.model = 'Players')
    OR (e.brand = 'Titleist' AND e.model = 'Players 4')
  )
ON CONFLICT DO NOTHING;

-- Create some bag likes for popular bags
INSERT INTO bag_likes (user_id, bag_id)
SELECT 
  p.id as user_id,
  b.id as bag_id
FROM profiles p
CROSS JOIN user_bags b
WHERE p.id != b.user_id
  AND b.user_id IN ('d7bed2c5-8c1e-4d7a-b3ea-0e1f7b6a9c8d', 'a9fc3d45-7e2b-4c5f-9d1e-3b8f2a6c5e7d') -- Popular bags
  AND RANDOM() < 0.7 -- 70% chance of liking popular bags
ON CONFLICT DO NOTHING;

-- Create some follows between users
INSERT INTO user_follows (follower_id, following_id)
SELECT DISTINCT
  p1.id as follower_id,
  p2.id as following_id
FROM profiles p1
CROSS JOIN profiles p2
WHERE p1.id != p2.id
  AND (
    -- Everyone follows the pros
    (p2.username IN ('tiger-woods', 'rory-mcilroy', 'lydia-ko') AND RANDOM() < 0.8)
    -- Some people follow each other
    OR (p1.username LIKE '%amateur%' AND p2.username LIKE '%weekend%' AND RANDOM() < 0.5)
  )
ON CONFLICT DO NOTHING;

-- Create some feed posts
INSERT INTO feed_posts (user_id, type, content) VALUES
('d7bed2c5-8c1e-4d7a-b3ea-0e1f7b6a9c8d', 'new_equipment', '{"message": "Just added the new Qi10 driver to my bag. The forgiveness is incredible!", "equipment_id": null}'::jsonb),
('a9fc3d45-7e2b-4c5f-9d1e-3b8f2a6c5e7d', 'bag_update', '{"message": "Switched to the Spider Tour putter. Loving the stability on fast greens.", "changes": ["Added Spider Tour putter", "Removed old putter"]}'::jsonb),
('c5d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'playing', '{"message": "Great practice round today. The new Ping setup is really dialed in!", "course": "Augusta National", "score": 72}'::jsonb),
('b3a7e5c9-8f2d-4a1b-9c6e-2d5f8e7a3b4c', 'milestone', '{"message": "Finally broke 80! The new irons made such a difference.", "achievement": "Broke 80", "score": 79}'::jsonb)
ON CONFLICT DO NOTHING;