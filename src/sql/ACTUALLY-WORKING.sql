-- CORRECT SQL based on your ACTUAL schema

-- 1. Create bags using ONLY columns that exist
-- user_bags columns: user_id, name, is_primary, bag_type, total_value
INSERT INTO user_bags (user_id, name, is_primary, bag_type) VALUES
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Rory McIlroy 2024', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Scottie Scheffler #1', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jon Rahm Masters', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Viktor Hovland', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Xander Schauffele', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Collin Morikawa', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Justin Thomas', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Jordan Spieth', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Patrick Cantlay', false, 'tour'),
  ('68cf7bbe-e7d3-4255-a18c-f890766ff77b', 'Dustin Johnson', false, 'tour');

-- 2. Add equipment to bags
-- bag_equipment columns: bag_id, equipment_id, purchase_date, purchase_price, notes, position_data, condition
WITH bag_equipment_data AS (
  SELECT DISTINCT ON (b.id, e.category)
    b.id as bag_id,
    e.id as equipment_id,
    CURRENT_DATE - INTERVAL '30 days' as purchase_date,
    e.msrp as purchase_price,
    CASE 
      WHEN e.category = 'driver' THEN 'Gamer - dialed in perfectly'
      WHEN e.category = 'putter' THEN 'Custom grip and weights'
      WHEN e.category = 'ball' THEN '2024 model'
      ELSE NULL
    END as notes,
    jsonb_build_object(
      'slot', ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY e.category),
      'category', e.category
    ) as position_data,
    'excellent' as condition
  FROM user_bags b
  CROSS JOIN equipment e
  WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
    AND b.created_at >= NOW() - INTERVAL '10 minutes'
    AND e.category IN ('driver', 'fairway_wood', 'iron', 'wedge', 'putter', 'ball', 'bag', 'glove', 'tees')
    AND (
      -- Match brands to golfers
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
      -- Always include these categories regardless of brand
      e.category IN ('ball', 'bag', 'glove', 'tees')
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
INSERT INTO bag_equipment (bag_id, equipment_id, purchase_date, purchase_price, notes, position_data, condition)
SELECT bag_id, equipment_id, purchase_date, purchase_price, notes, position_data, condition
FROM bag_equipment_data;

-- 3. Update total_value for each bag
UPDATE user_bags
SET total_value = (
  SELECT COALESCE(SUM(be.purchase_price), 0)
  FROM bag_equipment be
  WHERE be.bag_id = user_bags.id
)
WHERE user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND created_at >= NOW() - INTERVAL '10 minutes';

-- 4. Verify what was created
SELECT 
  b.name as "Bag Name",
  b.bag_type as "Type",
  COUNT(be.id) as "Equipment Count",
  b.total_value as "Total Value",
  STRING_AGG(DISTINCT e.brand, ', ' ORDER BY e.brand) as "Brands"
FROM user_bags b
LEFT JOIN bag_equipment be ON b.id = be.bag_id
LEFT JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY b.id, b.name, b.bag_type, b.total_value
ORDER BY b.name;

-- 5. Show equipment details for Rory's bag
SELECT 
  e.brand,
  e.model,
  e.category,
  be.condition,
  be.purchase_price,
  be.notes,
  be.position_data->>'slot' as slot
FROM user_bags b
JOIN bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.name = 'Rory McIlroy 2024'
  AND b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
ORDER BY (be.position_data->>'slot')::int;