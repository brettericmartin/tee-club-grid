-- Step 2: Update the migration to include all existing types

-- Add columns if they don't exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Drop the old constraint
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- Add new constraint that includes all types
ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
  CHECK (type IN ('equipment_photo', 'bag_created', 'bag_updated', 'new_equipment', 'bag_update'));