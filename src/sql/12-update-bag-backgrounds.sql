-- Update existing bags with proper background IDs

-- First, check what we have
SELECT id, name, background_image, bag_type
FROM user_bags
ORDER BY created_at DESC;

-- Update bags that don't have a valid background_image
-- This assigns backgrounds based on bag type for variety
UPDATE user_bags
SET background_image = CASE
  WHEN bag_type = 'tournament' THEN 'desert'
  WHEN bag_type = 'dream' THEN 'ocean'
  WHEN bag_type = 'seasonal' THEN 'mountain'
  ELSE 'midwest-lush'
END
WHERE background_image IS NULL 
   OR background_image NOT IN ('midwest-lush', 'desert', 'ocean', 'mountain');

-- Verify the update
SELECT id, name, background_image, bag_type
FROM user_bags
ORDER BY created_at DESC;