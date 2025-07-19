-- Step 4: Create update_updated_at_column function if it doesn't exist

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for feed_comments updated_at
DROP TRIGGER IF EXISTS update_feed_comments_updated_at ON feed_comments;
CREATE TRIGGER update_feed_comments_updated_at
BEFORE UPDATE ON feed_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();