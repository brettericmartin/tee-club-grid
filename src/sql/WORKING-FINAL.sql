-- WORKING SQL - Using ACTUAL table names from your schema.sql file

-- Table is called 'bags' NOT 'user_bags'
-- Has columns: user_id, name, description, is_public, background_image

-- 1. Create bags
INSERT INTO bags (user_id, name, description, is_public) VALUES
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

-- 2. Add equipment to bags
-- bag_equipment columns: bag_id, equipment_id, is_featured, purchase_date, purchase_price, notes, shaft_id, grip_id
-- NO position column!

WITH bag_equipment_data AS (
  SELECT DISTINCT ON (b.id, e.category)
    b.id as bag_id,
    e.id as equipment_id,
    CASE 
      WHEN e.category IN ('driver', 'putter', 'ball') THEN true
      ELSE false
    END as is_featured,
    CURRENT_DATE - INTERVAL '30 days' as purchase_date,
    e.msrp as purchase_price,
    CASE 
      WHEN e.category = 'driver' THEN 'Gamer - dialed in perfectly'
      WHEN e.category = 'putter' THEN 'Custom grip and weights'
      WHEN e.category = 'ball' THEN '2024 model'
      ELSE NULL
    END as notes
  FROM bags b
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
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_date, purchase_price, notes)
SELECT bag_id, equipment_id, is_featured, purchase_date, purchase_price, notes
FROM bag_equipment_data
ON CONFLICT (bag_id, equipment_id) DO NOTHING;

-- 3. Verify what was created
SELECT 
  b.name as "Bag Name",
  b.description as "Description",
  COUNT(be.id) as "Equipment Count",
  COUNT(CASE WHEN be.is_featured THEN 1 END) as "Featured Items",
  STRING_AGG(DISTINCT e.brand, ', ' ORDER BY e.brand) as "Brands"
FROM bags b
LEFT JOIN bag_equipment be ON b.id = be.bag_id
LEFT JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY b.id, b.name, b.description
ORDER BY b.name;

-- 4. Show equipment details for Rory's bag
SELECT 
  e.brand,
  e.model,
  e.category,
  be.is_featured,
  be.purchase_price,
  be.notes
FROM bags b
JOIN bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.name = 'Rory McIlroy 2024'
  AND b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
ORDER BY 
  CASE e.category
    WHEN 'driver' THEN 1
    WHEN 'fairway_wood' THEN 2
    WHEN 'iron' THEN 3
    WHEN 'wedge' THEN 4
    WHEN 'putter' THEN 5
    WHEN 'ball' THEN 6
    ELSE 7
  END;