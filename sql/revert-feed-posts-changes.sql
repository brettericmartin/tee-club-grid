-- EMERGENCY REVERT: Remove columns that are breaking production

-- Remove the columns we added
ALTER TABLE feed_posts DROP COLUMN IF EXISTS equipment_id CASCADE;
ALTER TABLE feed_posts DROP COLUMN IF EXISTS bag_id CASCADE;
ALTER TABLE feed_posts DROP COLUMN IF EXISTS media_urls CASCADE;

-- Drop the indexes we created
DROP INDEX IF EXISTS idx_feed_posts_user_equipment_time;
DROP INDEX IF EXISTS idx_feed_posts_bag_id;

-- Restore original type constraint
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;
ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN ('new_equipment', 'bag_update', 'milestone', 'playing'));

-- Verify the table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'feed_posts' ORDER BY ordinal_position;