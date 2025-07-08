-- Check bag backgrounds

-- 1. See what backgrounds are currently set
SELECT 
  id,
  name,
  background_image,
  created_at
FROM user_bags
ORDER BY created_at DESC;

-- 2. Update bags that have NULL background_image with a default
-- Uncomment to run:
-- UPDATE user_bags
-- SET background_image = 'midwest-lush'
-- WHERE background_image IS NULL;

-- 3. Or set different backgrounds based on bag type
-- UPDATE user_bags
-- SET background_image = CASE
--   WHEN bag_type = 'tournament' THEN 'arizona-desert'
--   WHEN bag_type = 'dream' THEN 'california-sunset'
--   ELSE 'midwest-lush'
-- END
-- WHERE background_image IS NULL;