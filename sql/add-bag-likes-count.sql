-- Add likes_count column to user_bags table for performance optimization
-- This avoids having to COUNT from bag_likes table on every query

-- Add the column if it doesn't exist
ALTER TABLE user_bags ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Update existing bags with their current like counts
UPDATE user_bags 
SET likes_count = (
  SELECT COUNT(*) 
  FROM bag_likes 
  WHERE bag_likes.bag_id = user_bags.id
);

-- Create a function to automatically update likes_count
CREATE OR REPLACE FUNCTION update_bag_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_bags 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.bag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_bags 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.bag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to keep likes_count in sync
DROP TRIGGER IF EXISTS update_bag_likes_count_trigger ON bag_likes;
CREATE TRIGGER update_bag_likes_count_trigger
AFTER INSERT OR DELETE ON bag_likes
FOR EACH ROW
EXECUTE FUNCTION update_bag_likes_count();

-- Verify the update worked
SELECT 
  ub.id,
  ub.name,
  ub.likes_count,
  (SELECT COUNT(*) FROM bag_likes WHERE bag_id = ub.id) as actual_count
FROM user_bags ub
WHERE ub.likes_count != (SELECT COUNT(*) FROM bag_likes WHERE bag_id = ub.id);