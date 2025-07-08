-- Debug: Check bags in database

-- 1. Count total bags
SELECT COUNT(*) as total_bags FROM user_bags;

-- 2. List all bags with details
SELECT 
  ub.id,
  ub.name,
  ub.bag_type,
  ub.created_at,
  ub.user_id,
  p.username,
  p.display_name,
  (SELECT email FROM auth.users WHERE id = p.id) as email
FROM user_bags ub
LEFT JOIN profiles p ON p.id = ub.user_id
ORDER BY ub.created_at DESC;

-- 3. Check if profiles exist for bag owners
SELECT 
  ub.user_id,
  COUNT(*) as bag_count,
  CASE WHEN p.id IS NULL THEN 'No profile' ELSE 'Has profile' END as profile_status
FROM user_bags ub
LEFT JOIN profiles p ON p.id = ub.user_id
GROUP BY ub.user_id, p.id;

-- 4. Sample equipment counts per bag
SELECT 
  ub.name as bag_name,
  COUNT(be.id) as equipment_count
FROM user_bags ub
LEFT JOIN bag_equipment be ON be.bag_id = ub.id
GROUP BY ub.id, ub.name
ORDER BY equipment_count DESC;