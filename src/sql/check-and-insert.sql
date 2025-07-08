-- STEP 1: First, let's check what columns actually exist in your tables
-- Run this query first to see the actual schema:

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('user_bags', 'bag_equipment')
ORDER BY table_name, ordinal_position;

-- STEP 2: After confirming the columns, here's the corrected insert
-- Based on your service code, user_bags only needs: user_id, name, is_public

-- Create bags with only the columns that exist
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

-- STEP 3: Add equipment to bags
-- First, let's verify what columns bag_equipment actually has
-- Based on TypeScript: bag_id, equipment_id, is_featured, purchase_date, purchase_price, notes, custom_specs

-- Simple version - just add equipment without custom specs first
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured)
SELECT 
  b.id as bag_id,
  e.id as equipment_id,
  CASE 
    WHEN e.category IN ('driver', 'putter', 'ball') THEN true
    ELSE false
  END as is_featured
FROM user_bags b
CROSS JOIN equipment e
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.created_at >= NOW() - INTERVAL '5 minutes'
  AND e.category IN ('driver', 'iron', 'wedge', 'putter', 'ball')
  AND (
    -- Match brands to golfers
    (b.name LIKE '%Rory%' AND e.brand = 'TaylorMade') OR
    (b.name LIKE '%Scottie%' AND e.brand IN ('TaylorMade', 'Titleist', 'Scotty Cameron')) OR
    (b.name LIKE '%Rahm%' AND e.brand IN ('Callaway', 'Odyssey')) OR
    (b.name LIKE '%Viktor%' AND e.brand = 'Ping') OR
    (b.name LIKE '%Thomas%' AND e.brand IN ('Titleist', 'Scotty Cameron')) OR
    (b.name LIKE '%Spieth%' AND e.brand IN ('Titleist', 'Scotty Cameron')) OR
    (b.name LIKE '%Johnson%' AND e.brand = 'TaylorMade') OR
    -- Default brands for others
    (b.name IN ('Xander Schauffele', 'Collin Morikawa', 'Patrick Cantlay'))
  )
ON CONFLICT DO NOTHING;  -- Avoid duplicates if re-running

-- STEP 4: Verify what was created
SELECT 
  b.name as "Bag Name",
  COUNT(be.id) as "Equipment Count",
  COUNT(CASE WHEN be.is_featured THEN 1 END) as "Featured Items"
FROM user_bags b
LEFT JOIN bag_equipment be ON b.id = be.bag_id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
GROUP BY b.id, b.name
ORDER BY b.name;