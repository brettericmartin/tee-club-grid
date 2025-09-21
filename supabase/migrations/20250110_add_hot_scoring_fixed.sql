-- Add hot scoring columns to feed_posts
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS hot_score DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_hour_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_day_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_week_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hot_score_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add hot scoring columns to user_bags
ALTER TABLE public.user_bags
ADD COLUMN IF NOT EXISTS hot_score DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_hour_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_day_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tees_week_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hot_score_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add boost columns to equipment (for future sponsored/featured items)
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS boost_factor DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for hot score queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_hot_score ON public.feed_posts(hot_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_bags_hot_score ON public.user_bags(hot_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_hot ON public.feed_posts(created_at DESC, hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_bags_created_hot ON public.user_bags(created_at DESC, hot_score DESC);

-- Function to calculate hot score with BIGINT parameters (FIXED!)
DROP FUNCTION IF EXISTS calculate_hot_score(INTEGER, INTEGER, INTEGER, TIMESTAMP WITH TIME ZONE, DECIMAL);

CREATE OR REPLACE FUNCTION calculate_hot_score(
  tees_1h BIGINT,
  tees_1d BIGINT,
  tees_1w BIGINT,
  created_time TIMESTAMP WITH TIME ZONE,
  boost DECIMAL DEFAULT 1.0
) RETURNS DECIMAL AS $$
DECLARE
  hours_old DECIMAL;
  tee_velocity DECIMAL;
  time_penalty DECIMAL;
  base_score DECIMAL;
BEGIN
  -- Calculate hours since creation
  hours_old := EXTRACT(EPOCH FROM (NOW() - created_time)) / 3600.0;
  
  -- Calculate weighted tee velocity (recent tees weighted more heavily)
  tee_velocity := (COALESCE(tees_1h, 0) * 3.0) + 
                  (COALESCE(tees_1d, 0) * 1.5) + 
                  (COALESCE(tees_1w, 0) * 0.5);
  
  -- Time decay penalty (similar to Reddit's algorithm)
  time_penalty := POWER(hours_old + 2, 1.5);
  
  -- Calculate base score with logarithmic scaling
  IF tee_velocity > 0 THEN
    base_score := LOG(tee_velocity + 1) * 10000;
  ELSE
    base_score := 0;
  END IF;
  
  -- Apply time penalty and boost
  RETURN (base_score / time_penalty) * COALESCE(boost, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to update tee velocity counts for feed posts
CREATE OR REPLACE FUNCTION update_feed_post_tee_counts(post_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE feed_posts SET
    tees_hour_1 = (
      SELECT COUNT(*) FROM feed_likes 
      WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id 
      AND feed_likes.created_at >= NOW() - INTERVAL '1 hour'
    ),
    tees_day_1 = (
      SELECT COUNT(*) FROM feed_likes 
      WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id 
      AND feed_likes.created_at >= NOW() - INTERVAL '1 day'
    ),
    tees_week_1 = (
      SELECT COUNT(*) FROM feed_likes 
      WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id 
      AND feed_likes.created_at >= NOW() - INTERVAL '1 week'
    ),
    hot_score = calculate_hot_score(
      (SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id AND feed_likes.created_at >= NOW() - INTERVAL '1 hour'),
      (SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id AND feed_likes.created_at >= NOW() - INTERVAL '1 day'),
      (SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = update_feed_post_tee_counts.post_id AND feed_likes.created_at >= NOW() - INTERVAL '1 week'),
      feed_posts.created_at,
      1.0
    ),
    hot_score_updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update tee velocity counts for bags
CREATE OR REPLACE FUNCTION update_bag_tee_counts(bag_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE user_bags SET
    tees_hour_1 = (
      SELECT COUNT(*) FROM bag_tees 
      WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id 
      AND bag_tees.created_at >= NOW() - INTERVAL '1 hour'
    ),
    tees_day_1 = (
      SELECT COUNT(*) FROM bag_tees 
      WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id 
      AND bag_tees.created_at >= NOW() - INTERVAL '1 day'
    ),
    tees_week_1 = (
      SELECT COUNT(*) FROM bag_tees 
      WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id 
      AND bag_tees.created_at >= NOW() - INTERVAL '1 week'
    ),
    hot_score = calculate_hot_score(
      (SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id AND bag_tees.created_at >= NOW() - INTERVAL '1 hour'),
      (SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id AND bag_tees.created_at >= NOW() - INTERVAL '1 day'),
      (SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = update_bag_tee_counts.bag_id AND bag_tees.created_at >= NOW() - INTERVAL '1 week'),
      user_bags.created_at,
      1.0
    ),
    hot_score_updated_at = NOW()
  WHERE id = bag_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update hot scores when likes are added/removed
CREATE OR REPLACE FUNCTION trigger_update_feed_hot_score() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_feed_post_tee_counts(NEW.post_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_feed_post_tee_counts(OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_bag_hot_score() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_bag_tee_counts(NEW.bag_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_bag_tee_counts(OLD.bag_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_feed_hot_score_trigger ON public.feed_likes;
CREATE TRIGGER update_feed_hot_score_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW
EXECUTE FUNCTION trigger_update_feed_hot_score();

DROP TRIGGER IF EXISTS update_bag_hot_score_trigger ON public.bag_tees;
CREATE TRIGGER update_bag_hot_score_trigger
AFTER INSERT OR DELETE ON public.bag_tees
FOR EACH ROW
EXECUTE FUNCTION trigger_update_bag_hot_score();

-- Initialize hot scores for existing content (last 30 days)
DO $$
DECLARE
  post RECORD;
  bag RECORD;
BEGIN
  -- Update feed posts from last 30 days
  FOR post IN 
    SELECT id FROM feed_posts 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  LOOP
    PERFORM update_feed_post_tee_counts(post.id);
  END LOOP;
  
  -- Update bags from last 30 days
  FOR bag IN 
    SELECT id FROM user_bags 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  LOOP
    PERFORM update_bag_tee_counts(bag.id);
  END LOOP;
END $$;