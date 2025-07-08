-- Test database setup
-- Run these queries in Supabase SQL editor to verify setup

-- 1. Check if user_bags table has the new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_bags' 
AND column_name IN ('bag_type', 'is_primary', 'description', 'background_image');

-- 2. Check if shafts, grips, and loft_options tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shafts', 'grips', 'loft_options');

-- 3. Check if bag_equipment has the new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bag_equipment' 
AND column_name IN ('shaft_id', 'grip_id', 'loft_option_id', 'is_featured', 'custom_photo_url');

-- 4. Check if the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'check_equipment_exists';

-- 5. Test query to see user bags
SELECT 
  ub.id,
  ub.name,
  ub.bag_type,
  ub.is_primary,
  ub.user_id,
  p.username,
  p.full_name
FROM user_bags ub
LEFT JOIN profiles p ON p.id = ub.user_id
ORDER BY ub.created_at DESC
LIMIT 10;