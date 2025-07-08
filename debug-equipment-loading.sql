-- Debug Equipment Loading Issues
-- Run these queries in Supabase SQL editor to diagnose the problem

-- 1. Check if bag_equipment table has data
SELECT 
  be.id,
  be.bag_id,
  be.equipment_id,
  be.position,
  ub.name as bag_name,
  ub.user_id
FROM bag_equipment be
JOIN user_bags ub ON ub.id = be.bag_id
WHERE ub.user_id = auth.uid()
LIMIT 10;

-- 2. Check if equipment table has the referenced items
SELECT 
  e.id,
  e.brand,
  e.model,
  e.category
FROM equipment e
WHERE e.id IN (
  SELECT equipment_id 
  FROM bag_equipment be
  JOIN user_bags ub ON ub.id = be.bag_id
  WHERE ub.user_id = auth.uid()
)
LIMIT 10;

-- 3. Check what columns exist on bag_equipment
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bag_equipment'
ORDER BY ordinal_position;

-- 4. Simple test query - what the component is trying to do
SELECT 
  be.*,
  row_to_json(e.*) as equipment
FROM bag_equipment be
LEFT JOIN equipment e ON e.id = be.equipment_id
WHERE be.bag_id IN (
  SELECT id FROM user_bags WHERE user_id = auth.uid()
)
ORDER BY be.position;

-- 5. Check if the optional tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'shafts'
) as shafts_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'grips'
) as grips_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'loft_options'
) as loft_options_exists;