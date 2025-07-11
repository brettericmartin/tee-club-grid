-- Update feed_posts type constraint to include all needed types

-- 1. First, drop the existing constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- 2. Add new constraint with all types
ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN (
  'new_equipment',
  'bag_update', 
  'milestone',
  'playing',
  'equipment_photo',
  'bag_created',
  'bag_updated'
));

-- 3. Update any existing equipment addition posts to use consistent type
-- (The triggers we created use 'equipment_photo' but the app might use 'new_equipment')
-- We'll keep both for compatibility

-- 4. Show current types
SELECT type, COUNT(*) as count 
FROM feed_posts 
GROUP BY type 
ORDER BY type;