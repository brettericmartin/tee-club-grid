-- Simplest Working Version - No fancy features, just get data in

-- 1. Create bags
INSERT INTO user_bags (user_id, name, is_public) VALUES
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Rory McIlroy 2024', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Scottie Scheffler #1', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jon Rahm Masters', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Viktor Hovland', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Xander Schauffele', true);

-- 2. Get some equipment IDs (run this to see what's available)
SELECT id, brand, model, category 
FROM equipment 
WHERE category IN ('driver', 'iron', 'putter', 'ball')
LIMIT 20;

-- 3. Add equipment to Rory's bag (example - adjust IDs based on step 2 results)
-- You'll need to replace these equipment IDs with actual IDs from your database
INSERT INTO bag_equipment (bag_id, equipment_id, position)
SELECT 
  b.id,
  e.id,
  ROW_NUMBER() OVER (ORDER BY e.category) - 1
FROM user_bags b
CROSS JOIN (
  SELECT id FROM equipment WHERE category = 'driver' AND brand = 'TaylorMade' LIMIT 1
  UNION ALL
  SELECT id FROM equipment WHERE category = 'iron' AND brand = 'TaylorMade' LIMIT 1
  UNION ALL
  SELECT id FROM equipment WHERE category = 'putter' LIMIT 1
  UNION ALL
  SELECT id FROM equipment WHERE category = 'ball' LIMIT 1
) e
WHERE b.name = 'Rory McIlroy 2024'
  AND b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

-- 4. Check what we created
SELECT 
  b.name,
  e.brand,
  e.model,
  e.category
FROM user_bags b
JOIN bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
ORDER BY b.name, be.position;