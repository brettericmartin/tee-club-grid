-- Safe Version - Uses ONLY columns we know exist from the code

-- 1. Create bags (using only columns from createBag service)
INSERT INTO user_bags (user_id, name, is_public) VALUES
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Rory McIlroy 2024', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Scottie Scheffler #1', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jon Rahm Masters', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Viktor Hovland', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Xander Schauffele', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Collin Morikawa', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Justin Thomas', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jordan Spieth', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Patrick Cantlay', true),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Dustin Johnson', true);

-- 2. Add equipment (using only columns from useBag hook: bag_id, equipment_id, position)
WITH equipment_positions AS (
  SELECT 
    b.id as bag_id,
    e.id as equipment_id,
    ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY e.category, e.model) - 1 as position
  FROM user_bags b
  CROSS JOIN equipment e
  WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
    AND b.name IN ('Rory McIlroy 2024', 'Scottie Scheffler #1', 'Jon Rahm Masters', 
                   'Viktor Hovland', 'Xander Schauffele', 'Collin Morikawa',
                   'Justin Thomas', 'Jordan Spieth', 'Patrick Cantlay', 'Dustin Johnson')
    AND e.category IN ('driver', 'iron', 'wedge', 'putter', 'ball')
    AND (
      -- Match some brands
      (b.name = 'Rory McIlroy 2024' AND e.brand = 'TaylorMade') OR
      (b.name = 'Jon Rahm Masters' AND e.brand = 'Callaway') OR
      (b.name = 'Viktor Hovland' AND e.brand = 'Ping') OR
      (b.name IN ('Justin Thomas', 'Jordan Spieth') AND e.brand = 'Titleist') OR
      -- For others, just take first available in each category
      true
    )
    -- Limit to one per category per bag
    AND NOT EXISTS (
      SELECT 1 FROM equipment e2 
      WHERE e2.category = e.category 
      AND e2.id < e.id
      AND (
        (b.name = 'Rory McIlroy 2024' AND e2.brand = 'TaylorMade' AND e.brand = 'TaylorMade') OR
        (b.name = 'Jon Rahm Masters' AND e2.brand = 'Callaway' AND e.brand = 'Callaway') OR
        (b.name = 'Viktor Hovland' AND e2.brand = 'Ping' AND e.brand = 'Ping') OR
        (b.name IN ('Justin Thomas', 'Jordan Spieth') AND e2.brand = 'Titleist' AND e.brand = 'Titleist')
      )
    )
)
INSERT INTO bag_equipment (bag_id, equipment_id, position)
SELECT bag_id, equipment_id, position
FROM equipment_positions;

-- 3. Verify
SELECT 
  b.name,
  COUNT(be.equipment_id) as equipment_count
FROM user_bags b
LEFT JOIN bag_equipment be ON b.id = be.bag_id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.name LIKE '%McIlroy%' OR b.name LIKE '%Scheffler%' OR b.name LIKE '%Rahm%'
GROUP BY b.name;