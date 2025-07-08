-- Complete SQL setup for pro golfer bags
-- Run these queries in order in Supabase SQL editor

-- STEP 1: First, check if you have the necessary equipment categories
-- This query shows what equipment is already in your database
SELECT category, COUNT(*) as count 
FROM equipment 
GROUP BY category
ORDER BY category;

-- STEP 2: Add any missing accessories/equipment (if not already added)
-- Only run if you're missing these items
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) 
VALUES
-- Bags
('TaylorMade', 'Tour Staff Bag', 'bag', 649.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Professional tour staff bag', '{"weight": "10.5 lbs", "pockets": "10"}'),
('Titleist', 'Players 4 Plus StaDry', 'bag', 329.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'Lightweight waterproof stand bag', '{"weight": "5.5 lbs", "pockets": "8"}'),
-- Gloves  
('FootJoy', 'Pure Touch Limited', 'glove', 34.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Tour-preferred premium leather glove', '{"material": "Premium cabretta leather"}'),
-- Tees
('Pride', 'Professional Tees', 'tees', 9.99, 2024, 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=400&fit=crop&q=80', 'Tour-quality wooden tees', '{"material": "Hardwood", "lengths": "2.75, 3.25, 4"}'),
-- Rangefinders
('Bushnell', 'Pro X3', 'rangefinder', 599.99, 2024, 'https://images.unsplash.com/photo-1606924842624-8778c7b4c3aa?w=400&h=400&fit=crop&q=80', 'Tournament-legal laser rangefinder', '{"range": "5-1300 yards", "accuracy": "+/- 1 yard"}')
ON CONFLICT (brand, model, category) DO NOTHING;

-- STEP 3: Get a user ID to associate the bags with
-- Run this to see available users
SELECT id, username, email FROM profiles LIMIT 10;

-- STEP 4: Create multiple pro bags for a single user
-- REPLACE 'YOUR_USER_ID_HERE' with an actual ID from step 3
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE';  -- <-- CHANGE THIS!
  v_bag_id UUID;
BEGIN
  -- Create Rory McIlroy's bag
  INSERT INTO user_bags (user_id, name, description, is_public)
  VALUES (v_user_id, 'Rory McIlroy 2024', 'TaylorMade Qi10 tour setup', true)
  RETURNING id INTO v_bag_id;
  
  -- Add equipment to Rory's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
  SELECT 
    v_bag_id,
    e.id,
    specs.custom_specs,
    specs.notes
  FROM equipment e
  JOIN (VALUES
    ('TaylorMade', 'Qi10', 'driver', 'Fujikura Ventus Black 6X, 9°', 'Gamer'),
    ('TaylorMade', 'Stealth 2', 'fairway_wood', '15° and 19°', '3W and 5W'),
    ('TaylorMade', 'P760', 'iron', '4-PW, Project X 7.0', NULL),
    ('TaylorMade', 'MG4', 'wedge', '50°, 54°, 60°', 'Raw face'),
    ('TaylorMade', 'Spider Tour', 'putter', '35 inches', NULL),
    ('TaylorMade', 'TP5x', 'ball', NULL, '2024 model'),
    ('TaylorMade', 'Tour Staff Bag', 'bag', NULL, NULL),
    ('FootJoy', 'Pure Touch Limited', 'glove', 'Size ML', NULL),
    ('Pride', 'Professional Tees', 'tees', '3.25 inch', NULL),
    ('Bushnell', 'Pro X3', 'rangefinder', NULL, NULL)
  ) AS specs(brand, model, category, custom_specs, notes)
  ON e.brand = specs.brand 
    AND e.model = specs.model 
    AND e.category = specs.category;

  -- Create Scottie Scheffler's bag
  INSERT INTO user_bags (user_id, name, description, is_public)
  VALUES (v_user_id, 'Scottie Scheffler #1', 'World #1 mixed setup', true)
  RETURNING id INTO v_bag_id;
  
  -- Add equipment to Scottie's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
  SELECT 
    v_bag_id,
    e.id,
    specs.custom_specs,
    specs.notes
  FROM equipment e
  JOIN (VALUES
    ('TaylorMade', 'Qi10', 'driver', '8.5°, Ventus TR Black', 'Low spin'),
    ('TaylorMade', 'Stealth 2', 'fairway_wood', '16.5°', NULL),
    ('TaylorMade', 'P7TW', 'iron', '4-PW, DG Tour Issue X100', 'Tiger Woods design'),
    ('Titleist', 'Vokey SM9', 'wedge', '50°, 56°, 60°', NULL),
    ('Scotty Cameron', 'Phantom X 5', 'putter', '35 inches', 'Custom'),
    ('Titleist', 'Pro V1', 'ball', NULL, 'Left dash'),
    ('Titleist', 'Players 4 Plus StaDry', 'bag', NULL, NULL)
  ) AS specs(brand, model, category, custom_specs, notes)
  ON e.brand = specs.brand 
    AND e.model = specs.model 
    AND e.category = specs.category;

  -- Create Jon Rahm's bag
  INSERT INTO user_bags (user_id, name, description, is_public)
  VALUES (v_user_id, 'Jon Rahm Masters', 'Spanish Armada Callaway setup', true)
  RETURNING id INTO v_bag_id;
  
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
  SELECT 
    v_bag_id,
    e.id,
    specs.custom_specs,
    specs.notes
  FROM equipment e
  JOIN (VALUES
    ('Callaway', 'Paradym', 'driver', '10.5°, Aldila Tour Green', 'Triple Diamond'),
    ('Callaway', 'Paradym', 'fairway_wood', '15° and 18°', NULL),
    ('Callaway', 'Apex TCB', 'iron', '4-PW, Project X 6.5', NULL),
    ('Callaway', 'Jaws Raw', 'wedge', '52°, 56°, 60°', 'Raw face'),
    ('Odyssey', 'White Hot OG Rossie', 'putter', '35 inches', NULL),
    ('Callaway', 'Chrome Soft X', 'ball', NULL, 'LS model')
  ) AS specs(brand, model, category, custom_specs, notes)
  ON e.brand = specs.brand 
    AND e.model = specs.model 
    AND e.category = specs.category;

  -- Add more bags as needed...
  
END $$;

-- STEP 5: Verify the bags were created
SELECT 
  b.id,
  b.name,
  b.description,
  COUNT(be.id) as equipment_count
FROM user_bags b
LEFT JOIN user_bag_equipment be ON b.id = be.bag_id
WHERE b.user_id = 'YOUR_USER_ID_HERE'  -- <-- Use same ID as above
GROUP BY b.id, b.name, b.description
ORDER BY b.created_at DESC;

-- STEP 6: See detailed equipment in a specific bag
SELECT 
  b.name as bag_name,
  e.brand,
  e.model,
  e.category,
  be.custom_specs,
  be.notes
FROM user_bags b
JOIN user_bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.name = 'Rory McIlroy 2024'
ORDER BY 
  CASE e.category
    WHEN 'driver' THEN 1
    WHEN 'fairway_wood' THEN 2
    WHEN 'hybrid' THEN 3
    WHEN 'iron' THEN 4
    WHEN 'wedge' THEN 5
    WHEN 'putter' THEN 6
    WHEN 'ball' THEN 7
    WHEN 'bag' THEN 8
    ELSE 9
  END;