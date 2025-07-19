-- Step 7: Add comment count to posts and create trigger

-- Add comment count column
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON feed_comments;
CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON feed_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Update existing comment counts
UPDATE feed_posts 
SET comment_count = (
  SELECT COUNT(*) 
  FROM feed_comments 
  WHERE feed_comments.post_id = feed_posts.id
);