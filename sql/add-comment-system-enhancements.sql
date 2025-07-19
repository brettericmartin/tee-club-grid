-- Enhanced Comment System with Tees and Downvotes
-- This migration adds tees (likes) and downvotes to comments, plus engagement scoring

-- 1. Enhance feed_comments table
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS downvotes_count INTEGER DEFAULT 0;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create comment_tees table (using golf terminology)
CREATE TABLE IF NOT EXISTS comment_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- 3. Create comment_downvotes table
CREATE TABLE IF NOT EXISTS comment_downvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- 4. Update feed_posts to track comment engagement
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS comment_engagement_score FLOAT DEFAULT 0.0;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_tees_user ON comment_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_tees_comment ON comment_tees(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_downvotes_user ON comment_downvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_downvotes_comment ON comment_downvotes(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_parent ON feed_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_engagement ON feed_posts(comment_engagement_score DESC);

-- 6. Create function to update comment tees count
CREATE OR REPLACE FUNCTION update_comment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_comments 
    SET tees_count = tees_count + 1 
    WHERE id = NEW.comment_id;
    
    -- Also update user's total tees
    UPDATE profiles
    SET total_tees_received = COALESCE(total_tees_received, 0) + 1
    WHERE id = (SELECT user_id FROM feed_comments WHERE id = NEW.comment_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_comments 
    SET tees_count = GREATEST(tees_count - 1, 0) 
    WHERE id = OLD.comment_id;
    
    -- Also update user's total tees
    UPDATE profiles
    SET total_tees_received = GREATEST(COALESCE(total_tees_received, 0) - 1, 0)
    WHERE id = (SELECT user_id FROM feed_comments WHERE id = OLD.comment_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to update comment downvotes count
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

-- 8. Create function to update post comment count
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

-- 9. Create function to calculate comment engagement score
CREATE OR REPLACE FUNCTION calculate_comment_engagement_score(post_id UUID)
RETURNS FLOAT AS $$
DECLARE
  score FLOAT := 0;
  comment_record RECORD;
  hours_old FLOAT;
BEGIN
  -- Base score from comment count
  SELECT comment_count INTO score FROM feed_posts WHERE id = post_id;
  
  -- Add weighted score from comment engagement
  FOR comment_record IN 
    SELECT 
      tees_count,
      downvotes_count,
      created_at
    FROM feed_comments 
    WHERE post_id = post_id AND NOT is_hidden
  LOOP
    -- Calculate age decay (comments lose value over time)
    hours_old := EXTRACT(EPOCH FROM (NOW() - comment_record.created_at)) / 3600.0;
    
    -- Each tee on a comment adds value (with time decay)
    score := score + (comment_record.tees_count * 0.5 * POWER(0.95, hours_old/24));
    
    -- Heavily downvoted comments reduce engagement
    IF comment_record.downvotes_count >= 5 THEN
      score := score - 2;
    END IF;
  END LOOP;
  
  RETURN GREATEST(score, 0);
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers
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

DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON feed_comments;
CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON feed_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

DROP TRIGGER IF EXISTS update_feed_comments_updated_at ON feed_comments;
CREATE TRIGGER update_feed_comments_updated_at
BEFORE UPDATE ON feed_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 11. Add RLS policies
ALTER TABLE comment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_downvotes ENABLE ROW LEVEL SECURITY;

-- Anyone can view tees and downvotes
CREATE POLICY "Comment tees are viewable by everyone" ON comment_tees
  FOR SELECT USING (true);

CREATE POLICY "Comment downvotes are viewable by everyone" ON comment_downvotes
  FOR SELECT USING (true);

-- Users can only create/delete their own tees
CREATE POLICY "Users can manage their own comment tees" ON comment_tees
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comment downvotes" ON comment_downvotes
  FOR ALL USING (auth.uid() = user_id);

-- Update existing comment policies
DROP POLICY IF EXISTS "Users can create comments" ON feed_comments;
CREATE POLICY "Users can create comments when authenticated" ON feed_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON feed_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON feed_comments
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Create a function to update all post engagement scores (run periodically)
CREATE OR REPLACE FUNCTION update_all_engagement_scores()
RETURNS void AS $$
BEGIN
  UPDATE feed_posts
  SET comment_engagement_score = calculate_comment_engagement_score(id)
  WHERE comment_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 13. Add total_tees_received to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tees_received INTEGER DEFAULT 0;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ COMMENT SYSTEM ENHANCEMENTS COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was added:';
  RAISE NOTICE '✓ Tees (likes) for comments';
  RAISE NOTICE '✓ Downvotes with auto-hiding at -10';
  RAISE NOTICE '✓ Nested comment support';
  RAISE NOTICE '✓ Comment engagement scoring';
  RAISE NOTICE '✓ Performance indexes';
  RAISE NOTICE '✓ RLS policies for security';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the saved photos migration';
  RAISE NOTICE '2. Implement UI components';
  RAISE NOTICE '3. Test engagement scoring';
  RAISE NOTICE '';
END $$;