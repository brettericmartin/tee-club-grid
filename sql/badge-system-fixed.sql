-- Badge System Setup - Clean Version
-- This script will run without errors in Supabase

-- 1. Create user_actions table if not exists
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_actions_user_type ON user_actions(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions(created_at);

-- 2. Ensure user_badges has all needed columns
ALTER TABLE user_badges 
ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';

-- 3. Create badge checking function (fixed for Supabase)
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE(badge_id UUID, badge_name TEXT, newly_earned BOOLEAN) AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_earned BOOLEAN;
  v_existing_earned BOOLEAN;
  v_user_badge RECORD;
BEGIN
  -- Loop through all active badges
  FOR v_badge IN 
    SELECT b.id as badge_id, b.name as badge_name, bc.criteria_type, bc.threshold, bc.parameters
    FROM badges b
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE b.is_active = true
  LOOP
    -- Calculate progress based on criteria type
    v_progress := 0;
    
    IF v_badge.criteria_type = 'photos_uploaded' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM equipment_photos ep
      WHERE ep.user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'equipment_added' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM equipment e
      WHERE e.added_by_user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'bags_created' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_bags ub
      WHERE ub.user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'following_count' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_follows uf
      WHERE uf.follower_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'follower_count' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_follows uf
      WHERE uf.following_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'bag_likes' THEN
      SELECT COALESCE(MAX(ub.likes_count), 0)::INTEGER INTO v_progress
      FROM user_bags ub
      WHERE ub.user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'brand_items' THEN
      SELECT COUNT(DISTINCT be.equipment_id)::INTEGER INTO v_progress
      FROM bag_equipment be
      JOIN user_bags ub ON be.bag_id = ub.id
      JOIN equipment e ON be.equipment_id = e.id
      WHERE ub.user_id = p_user_id
      AND e.brand = (v_badge.parameters->>'brand')::TEXT;
      
    ELSIF v_badge.criteria_type = 'bag_equipment_count' THEN
      SELECT COALESCE(MAX(eq_count), 0)::INTEGER INTO v_progress
      FROM (
        SELECT COUNT(*)::INTEGER as eq_count
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        WHERE ub.user_id = p_user_id
        GROUP BY be.bag_id
      ) counts;
      
    ELSIF v_badge.criteria_type = 'single_brand_bag' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM (
        SELECT ub.id, COUNT(DISTINCT e.brand) as brand_count
        FROM user_bags ub
        JOIN bag_equipment be ON ub.id = be.bag_id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id
        GROUP BY ub.id
        HAVING COUNT(DISTINCT e.brand) = 1
        AND COUNT(*) >= 5
      ) single_brand_bags;
    END IF;
    
    -- Check if badge is earned
    v_earned := v_progress >= v_badge.threshold;
    
    -- Check if already earned
    SELECT ub.earned_at IS NOT NULL INTO v_existing_earned
    FROM user_badges ub
    WHERE ub.user_id = p_user_id 
    AND ub.badge_id = v_badge.badge_id;
    
    IF NOT FOUND THEN
      v_existing_earned := FALSE;
    END IF;
    
    -- Update or insert user_badge record
    INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
    VALUES (
      p_user_id, 
      v_badge.badge_id, 
      LEAST(100, (v_progress::FLOAT / v_badge.threshold * 100)::INTEGER),
      CASE WHEN v_earned THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) DO UPDATE
    SET 
      progress = EXCLUDED.progress,
      earned_at = CASE 
        WHEN user_badges.earned_at IS NULL AND EXCLUDED.earned_at IS NOT NULL 
        THEN EXCLUDED.earned_at 
        ELSE user_badges.earned_at 
      END;
    
    -- Return newly earned badges
    IF v_earned AND NOT v_existing_earned THEN
      badge_id := v_badge.badge_id;
      badge_name := v_badge.badge_name;
      newly_earned := true;
      RETURN NEXT;
      
      -- Create notification
      INSERT INTO badge_notifications (user_id, badge_id)
      VALUES (p_user_id, v_badge.badge_id);
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Public can view badges" ON badges;
CREATE POLICY "Public can view badges" ON badges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view badge criteria" ON badge_criteria;
CREATE POLICY "Public can view badge criteria" ON badge_criteria
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own actions" ON user_actions;
CREATE POLICY "Users can view own actions" ON user_actions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can track own actions" ON user_actions;
CREATE POLICY "Users can track own actions" ON user_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON badge_notifications;
CREATE POLICY "Users can view own notifications" ON badge_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON badge_notifications;
CREATE POLICY "Users can update own notifications" ON badge_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Simple triggers for auto-checking badges
CREATE OR REPLACE FUNCTION trigger_badge_check() RETURNS TRIGGER AS $$
BEGIN
  -- For inserts, use NEW.user_id
  IF TG_OP = 'INSERT' THEN
    PERFORM check_and_award_badges(NEW.user_id);
  -- For updates, check both old and new user
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM check_and_award_badges(OLD.user_id);
    END IF;
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS check_badges_on_photo ON equipment_photos;
CREATE TRIGGER check_badges_on_photo
  AFTER INSERT ON equipment_photos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

DROP TRIGGER IF EXISTS check_badges_on_bag ON user_bags;
CREATE TRIGGER check_badges_on_bag
  AFTER INSERT OR UPDATE ON user_bags
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

DROP TRIGGER IF EXISTS check_badges_on_follow ON user_follows;
CREATE TRIGGER check_badges_on_follow
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

-- 7. Run initial badge check for all users
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM profiles LIMIT 100
  LOOP
    PERFORM check_and_award_badges(v_user_id);
  END LOOP;
  
  RAISE NOTICE 'Badge system is now active!';
  RAISE NOTICE 'Badges will be automatically awarded for user actions.';
END $$;