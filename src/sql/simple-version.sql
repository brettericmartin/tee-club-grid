-- Simplified version without custom function
-- Just creates bags and adds whatever equipment is available

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

-- Add equipment to each bag - this will add one of each category to each bag
WITH bag_equipment AS (
  SELECT DISTINCT ON (b.id, e.category)
    b.id as bag_id,
    e.id as equipment_id,
    1 as quantity,
    -- Custom specs based on bag name and equipment
    CASE 
      WHEN b.name LIKE '%Rory%' AND e.category = 'driver' THEN 'Fujikura Ventus Black 6X, 9°'
      WHEN b.name LIKE '%Scottie%' AND e.category = 'driver' THEN '8.5°, Ventus TR Black 6X'
      WHEN b.name LIKE '%Rahm%' AND e.category = 'driver' THEN '10.5°, Aldila Tour Green'
      WHEN b.name LIKE '%Viktor%' AND e.category = 'driver' THEN '9°, Ventus TR Blue'
      WHEN e.category = 'iron' THEN '4-PW'
      WHEN e.category = 'wedge' THEN '50°, 56°, 60°'
      WHEN e.category = 'putter' THEN '35 inches'
      ELSE NULL
    END as custom_specs,
    -- Notes based on equipment
    CASE 
      WHEN e.category = 'driver' THEN 'Gamer'
      WHEN e.category = 'ball' THEN '2024 model'
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
INSERT INTO user_bag_equipment (bag_id, equipment_id, quantity, custom_specs, notes)
SELECT bag_id, equipment_id, quantity, custom_specs, notes
FROM bag_equipment;

-- Verify the bags were created
SELECT 
  b.name,
  COUNT(be.id) as equipment_count,
  STRING_AGG(DISTINCT e.brand, ', ' ORDER BY e.brand) as brands
FROM user_bags b
LEFT JOIN user_bag_equipment be ON b.id = be.bag_id
LEFT JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.created_at >= NOW() - INTERVAL '5 minutes'
GROUP BY b.id, b.name
ORDER BY b.name;