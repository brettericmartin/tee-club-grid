-- Add equipment_id column to feed_posts table for better post tracking
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;

-- Add bag_id column if it doesn't exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES user_bags(id) ON DELETE SET NULL;

-- Add media_urls column if it doesn't exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Create composite index for efficient equipment post lookups
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_equipment_time 
ON feed_posts(user_id, equipment_id, created_at DESC)
WHERE equipment_id IS NOT NULL;

-- Create index for bag posts
CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_id 
ON feed_posts(bag_id)
WHERE bag_id IS NOT NULL;

-- Add equipment_photo type to feed_posts type enum if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'equipment_photo' 
    AND enumtypid = (
      SELECT enumtypid 
      FROM pg_type 
      WHERE typname = (
        SELECT split_part(column_name || '_' || data_type, '_text', 1)
        FROM information_schema.columns 
        WHERE table_name = 'feed_posts' 
        AND column_name = 'type'
      )
    )
  ) THEN
    ALTER TYPE feed_post_type ADD VALUE IF NOT EXISTS 'equipment_photo';
  END IF;
END$$;

-- Update RLS policies to include equipment_id checks
ALTER POLICY "Users can view all posts" ON feed_posts USING (true);
ALTER POLICY "Users can create their own posts" ON feed_posts 
  WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update their own posts" ON feed_posts 
  USING (auth.uid() = user_id);
ALTER POLICY "Users can delete their own posts" ON feed_posts 
  USING (auth.uid() = user_id);