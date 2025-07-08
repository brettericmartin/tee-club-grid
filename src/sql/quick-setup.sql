-- Quick Setup: Pro Golfer Bags
-- Just replace YOUR_USER_ID with an actual user ID and run this entire script

-- Step 1: Find your user ID by running this first:
-- SELECT id, username FROM profiles LIMIT 5;

-- Step 2: Replace this with your actual user ID
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID';  -- <-- CHANGE THIS TO YOUR USER ID
BEGIN
  -- Create all 10 pro bags at once
  INSERT INTO user_bags (user_id, name, description, is_public) VALUES
    (v_user_id, 'Rory McIlroy 2024', 'TaylorMade Qi10 tour setup', true),
    (v_user_id, 'Scottie Scheffler #1', 'World #1 mixed setup', true),
    (v_user_id, 'Jon Rahm Masters', 'Spanish Armada Callaway', true),
    (v_user_id, 'Viktor Hovland', 'Norwegian Thunder PING', true),
    (v_user_id, 'Xander Schauffele', 'Olympic Gold Callaway', true),
    (v_user_id, 'Collin Morikawa', 'Iron specialist TaylorMade', true),
    (v_user_id, 'Justin Thomas', 'JT Titleist weapons', true),
    (v_user_id, 'Jordan Spieth', 'Texas Forever Titleist', true),
    (v_user_id, 'Patrick Cantlay', 'Calculated Titleist setup', true),
    (v_user_id, 'Dustin Johnson', 'DJ TaylorMade bombers', true);
    
  -- Add sample equipment to each bag
  -- This uses whatever equipment you have in your database
  INSERT INTO user_bag_equipment (bag_id, equipment_id, quantity)
  SELECT 
    b.id as bag_id,
    e.id as equipment_id,
    1 as quantity
  FROM user_bags b
  CROSS JOIN (
    -- Get a variety of equipment (limit to prevent too many items)
    SELECT DISTINCT ON (category) id, category
    FROM equipment
    WHERE category IN ('driver', 'iron', 'wedge', 'putter', 'ball', 'bag', 'glove', 'tees')
    ORDER BY category, brand, model
  ) e
  WHERE b.user_id = v_user_id
    AND b.created_at >= NOW() - INTERVAL '1 minute'; -- Only bags we just created
    
  RAISE NOTICE 'Successfully created % bags', 10;
END $$;

-- Verify it worked
SELECT 
  b.name as bag_name,
  COUNT(be.id) as equipment_count
FROM user_bags b
LEFT JOIN user_bag_equipment be ON b.id = be.bag_id
WHERE b.name LIKE '%McIlroy%' 
   OR b.name LIKE '%Scheffler%'
   OR b.name LIKE '%Rahm%'
GROUP BY b.name
ORDER BY b.name;