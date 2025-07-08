-- Debug Schema Issues

-- 1. Check user_bags columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_bags'
ORDER BY ordinal_position;

-- 2. Check bag_equipment columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bag_equipment'
ORDER BY ordinal_position;

-- 3. Test insert into user_bags (replace with your user_id)
-- This will show what columns are missing
INSERT INTO user_bags (
  user_id,
  name,
  bag_type
) VALUES (
  auth.uid(),
  'Test Bag',
  'real'
) RETURNING *;

-- 4. Test insert into bag_equipment (replace with actual IDs)
-- This will show what's failing
SELECT id FROM user_bags WHERE user_id = auth.uid() LIMIT 1;
SELECT id FROM equipment LIMIT 1;

-- Then try:
INSERT INTO bag_equipment (
  bag_id,
  equipment_id,
  condition,
  position_data
) VALUES (
  'YOUR_BAG_ID',
  'YOUR_EQUIPMENT_ID', 
  'new',
  '{"position": 0, "is_featured": false}'::jsonb
) RETURNING *;