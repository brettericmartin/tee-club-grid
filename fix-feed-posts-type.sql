-- Update the feed_posts table to include 'equipment_photo' type
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN ('new_equipment', 'bag_update', 'milestone', 'playing', 'equipment_photo'));