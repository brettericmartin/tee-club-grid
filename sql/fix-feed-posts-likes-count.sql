-- Fix the likes_count column in feed_posts table
-- This column appears to be out of sync with actual likes

-- Option 1: Update the column to match actual counts (one-time sync)
UPDATE feed_posts fp
SET likes_count = (
  SELECT COUNT(*)
  FROM feed_likes fl
  WHERE fl.post_id = fp.id
);

-- Option 2: Create a trigger to keep it in sync automatically
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_feed_post_likes_count_trigger ON feed_likes;

-- Create the trigger
CREATE TRIGGER update_feed_post_likes_count_trigger
AFTER INSERT OR DELETE ON feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_post_likes_count();

-- Verify the sync worked
SELECT 
  fp.id,
  fp.likes_count as column_count,
  COUNT(fl.id) as actual_count,
  fp.likes_count = COUNT(fl.id) as matches
FROM feed_posts fp
LEFT JOIN feed_likes fl ON fl.post_id = fp.id
GROUP BY fp.id
ORDER BY fp.created_at DESC
LIMIT 10;