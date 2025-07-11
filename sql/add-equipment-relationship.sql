-- Add equipment_id column to feed_posts if it doesn't exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES equipment(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_equipment_id ON feed_posts(equipment_id);

-- Update existing posts to extract equipment_id from content
UPDATE feed_posts
SET equipment_id = (content->>'equipment_id')::uuid
WHERE type IN ('new_equipment', 'equipment_photo')
AND equipment_id IS NULL
AND content->>'equipment_id' IS NOT NULL;