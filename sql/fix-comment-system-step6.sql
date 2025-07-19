-- Step 6: Create triggers for counting tees and downvotes

-- Function to update comment tees count
CREATE OR REPLACE FUNCTION update_comment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_comments 
    SET tees_count = tees_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_comments 
    SET tees_count = GREATEST(tees_count - 1, 0) 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment downvotes count
CREATE OR REPLACE FUNCTION update_comment_downvotes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_comments 
    SET downvotes_count = downvotes_count + 1 
    WHERE id = NEW.comment_id;
    
    -- Auto-hide comments with too many downvotes
    UPDATE feed_comments
    SET is_hidden = true
    WHERE id = NEW.comment_id AND downvotes_count >= 10;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_comments 
    SET downvotes_count = GREATEST(downvotes_count - 1, 0) 
    WHERE id = OLD.comment_id;
    
    -- Unhide if downvotes drop below threshold
    UPDATE feed_comments
    SET is_hidden = false
    WHERE id = OLD.comment_id AND downvotes_count < 10;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_comment_tees_count_trigger ON comment_tees;
CREATE TRIGGER update_comment_tees_count_trigger
AFTER INSERT OR DELETE ON comment_tees
FOR EACH ROW
EXECUTE FUNCTION update_comment_tees_count();

DROP TRIGGER IF EXISTS update_comment_downvotes_count_trigger ON comment_downvotes;
CREATE TRIGGER update_comment_downvotes_count_trigger
AFTER INSERT OR DELETE ON comment_downvotes
FOR EACH ROW
EXECUTE FUNCTION update_comment_downvotes_count();