-- Working Version - Fixed for your actual schema
-- This uses the correct table name: bag_equipment (not user_bag_equipment)

-- Create all 10 pro bags for user 68cf7bbe-e7d3-4255-a18c-f890766ff77b
INSERT INTO user_bags (user_id, name, description, is_public) VALUES
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Rory McIlroy 2024', 'TaylorMade Qi10 tour setup with Ventus shafts', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Scottie Scheffler #1', 'World #1 mixed TaylorMade/Titleist setup', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jon Rahm Masters', 'Spanish Armada - Full Callaway setup', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Viktor Hovland', 'Norwegian Thunder - PING precision', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Xander Schauffele', 'Olympic Gold winning Callaway clubs', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Collin Morikawa', 'Iron specialist TaylorMade precision', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Justin Thomas', 'JT''s Titleist major championship weapons', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jordan Spieth', 'Texas Forever - Classic Titleist setup', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Patrick Cantlay', 'Calculated precision with Titleist', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Dustin Johnson', 'DJ''s TaylorMade bombing setup', true);

-- Add equipment to each bag
-- Note: Using columns that exist in your schema: bag_id, equipment_id, is_featured, custom_specs, notes
-- NOT using: quantity (doesn't exist)
WITH bag_equipment_data AS (
  SELECT DISTINCT ON (b.id, e.category)
    b.id as bag_id,
    e.id as equipment_id,
    false as is_featured,  -- Set some as featured later if needed
    -- Custom specs based on bag name and equipment
    CASE 
      WHEN b.name LIKE '%Rory%' AND e.category = 'driver' THEN '{"loft": "9°", "shaft": "Fujikura Ventus Black 6X"}'::jsonb
      WHEN b.name LIKE '%Scottie%' AND e.category = 'driver' THEN '{"loft": "8.5°", "shaft": "Ventus TR Black 6X"}'::jsonb
      WHEN b.name LIKE '%Rahm%' AND e.category = 'driver' THEN '{"loft": "10.5°", "shaft": "Aldila Tour Green"}'::jsonb
      WHEN b.name LIKE '%Viktor%' AND e.category = 'driver' THEN '{"loft": "9°", "shaft": "Ventus TR Blue"}'::jsonb
      WHEN e.category = 'iron' THEN '{"set": "4-PW"}'::jsonb
      WHEN e.category = 'wedge' THEN '{"lofts": "50°, 56°, 60°"}'::jsonb
      WHEN e.category = 'putter' THEN '{"length": "35 inches"}'::jsonb
      ELSE NULL
    END as custom_specs,
    -- Notes based on equipment
    CASE 
      WHEN e.category = 'driver' THEN 'Gamer'
      WHEN e.category = 'ball' THEN '2024 model'
      WHEN e.category = 'putter' THEN 'Custom grip'
      ELSE NULL
    END as notes
  FROM user_bags b
  CROSS JOIN equipment e
  WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
    AND b.created_at >= NOW() - INTERVAL '5 minutes' -- Only bags we just created
    AND e.category IN ('driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter', 'ball', 'bag', 'glove', 'tees', 'rangefinder')
    AND (
      -- Try to match brands to golfers
      (b.name LIKE '%Rory%' AND e.brand = 'TaylorMade') OR
      (b.name LIKE '%Scottie%' AND e.brand IN ('TaylorMade', 'Titleist', 'Scotty Cameron')) OR
      (b.name LIKE '%Rahm%' AND e.brand IN ('Callaway', 'Odyssey')) OR
      (b.name LIKE '%Viktor%' AND e.brand = 'Ping') OR
      (b.name LIKE '%Xander%' AND e.brand IN ('Callaway', 'Odyssey')) OR
      (b.name LIKE '%Morikawa%' AND e.brand = 'TaylorMade') OR
      (b.name LIKE '%Thomas%' AND e.brand IN ('Titleist', 'Scotty Cameron')) OR
      (b.name LIKE '%Spieth%' AND e.brand IN ('Titleist', 'Scotty Cameron')) OR
      (b.name LIKE '%Cantlay%' AND e.brand IN ('Titleist', 'Scotty Cameron')) OR
      (b.name LIKE '%Johnson%' AND e.brand = 'TaylorMade') OR
      -- If no brand match, just take any equipment in that category
      e.category IN ('ball', 'bag', 'glove', 'tees', 'rangefinder')
    )
  ORDER BY b.id, e.category, 
    -- Prioritize brand matches
    CASE 
      WHEN b.name LIKE '%Rory%' AND e.brand = 'TaylorMade' THEN 1
      WHEN b.name LIKE '%Scottie%' AND e.brand IN ('TaylorMade', 'Titleist', 'Scotty Cameron') THEN 1
      WHEN b.name LIKE '%Rahm%' AND e.brand IN ('Callaway', 'Odyssey') THEN 1
      WHEN b.name LIKE '%Viktor%' AND e.brand = 'Ping' THEN 1
      ELSE 2
    END,
    e.model
)
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, custom_specs, notes)
SELECT bag_id, equipment_id, is_featured, custom_specs, notes
FROM bag_equipment_data;

-- Set a few items as featured (driver, putter, ball for each bag)
UPDATE bag_equipment be
SET is_featured = true
FROM equipment e
WHERE be.equipment_id = e.id
  AND e.category IN ('driver', 'putter', 'ball')
  AND be.bag_id IN (
    SELECT id FROM user_bags 
    WHERE user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
    AND created_at >= NOW() - INTERVAL '5 minutes'
  );

-- Verify the bags were created
SELECT 
  b.name as "Bag Name",
  COUNT(be.id) as "Equipment Count",
  COUNT(CASE WHEN be.is_featured THEN 1 END) as "Featured Items",
  STRING_AGG(DISTINCT e.brand, ', ' ORDER BY e.brand) as "Brands"
FROM user_bags b
LEFT JOIN bag_equipment be ON b.id = be.bag_id
LEFT JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.created_at >= NOW() - INTERVAL '5 minutes'
GROUP BY b.id, b.name
ORDER BY b.name;

-- Show featured equipment for one bag as example
SELECT 
  e.brand,
  e.model,
  e.category,
  be.is_featured,
  be.custom_specs,
  be.notes
FROM user_bags b
JOIN bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.name = 'Rory McIlroy 2024'
  AND b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
ORDER BY be.is_featured DESC, e.category;