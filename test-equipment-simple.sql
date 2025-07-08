-- Simple test to verify equipment loading

-- 1. Get your user ID
SELECT auth.uid() as your_user_id;

-- 2. Get your bags
SELECT id, name, user_id 
FROM user_bags 
WHERE user_id = auth.uid();

-- 3. Get equipment for your bags (simple version)
SELECT 
  be.id,
  be.bag_id,
  be.equipment_id,
  be.position,
  e.brand,
  e.model,
  e.category
FROM bag_equipment be
JOIN equipment e ON e.id = be.equipment_id
WHERE be.bag_id IN (
  SELECT id FROM user_bags WHERE user_id = auth.uid()
);

-- 4. If above returns nothing, check if bag_equipment has ANY data
SELECT COUNT(*) as total_bag_equipment FROM bag_equipment;

-- 5. Check if your specific bag has equipment (replace YOUR_BAG_ID)
-- You'll get the bag ID from query #2 above
SELECT * FROM bag_equipment WHERE bag_id = 'YOUR_BAG_ID';