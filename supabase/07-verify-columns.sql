-- Verify the migration worked correctly

-- 1. Check if columns were added
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bag_equipment'
  AND column_name IN ('is_featured', 'position')
ORDER BY column_name;

-- 2. Check if positions were set correctly (should show sequential positions per bag)
SELECT 
  bag_id,
  COUNT(*) as equipment_count,
  MIN(position) as min_position,
  MAX(position) as max_position,
  string_agg(position::text, ', ' ORDER BY position) as positions
FROM bag_equipment
GROUP BY bag_id
ORDER BY bag_id
LIMIT 10;

-- 3. Check if index was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'bag_equipment'
  AND indexname = 'idx_bag_equipment_bag_position';

-- 4. Test query - this is what the app will run
SELECT 
  be.*,
  e.brand,
  e.model
FROM bag_equipment be
JOIN equipment e ON e.id = be.equipment_id
WHERE be.bag_id IN (
  SELECT id FROM user_bags WHERE user_id = auth.uid() LIMIT 1
)
ORDER BY be.position, be.added_at
LIMIT 5;