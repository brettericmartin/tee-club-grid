-- Badge System - WORKING Version for Supabase
-- No ambiguous references, follows Supabase conventions

-- 1. Create user_actions table
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_type ON user_actions(user_id, action_type);

-- 2. Add progress_data column if missing
ALTER TABLE user_badges 
ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';

-- 3. Working badge check function - no ambiguous references
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE(out_badge_id UUID, out_badge_name TEXT, out_newly_earned BOOLEAN) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_earned BOOLEAN;
  v_already_earned BOOLEAN;
BEGIN
  -- Loop through all active badges with their criteria
  FOR v_badge IN 
    SELECT 
      b.id,
      b.name,
      bc.criteria_type,
      bc.threshold,
      bc.parameters
    FROM badges b
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE b.is_active = true
  LOOP
    -- Initialize progress
    v_progress := 0;
    
    -- Calculate progress based on criteria type
    IF v_badge.criteria_type = 'photos_uploaded' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM equipment_photos
      WHERE user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'equipment_added' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM equipment
      WHERE added_by_user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'bags_created' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_bags
      WHERE user_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'following_count' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_follows
      WHERE follower_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'follower_count' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM user_follows
      WHERE following_id = p_user_id;
      
    ELSIF v_badge.criteria_type = 'bag_likes' THEN
      SELECT COALESCE(MAX(likes_count), 0)::INTEGER INTO v_progress
      FROM user_bags
      WHERE user_id = p_user_id;
      
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
        SELECT COUNT(*) as eq_count
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        WHERE ub.user_id = p_user_id
        GROUP BY be.bag_id
      ) counts;
      
    ELSIF v_badge.criteria_type = 'single_brand_bag' THEN
      SELECT COUNT(*)::INTEGER INTO v_progress
      FROM (
        SELECT ub.id
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
    
    -- Check if user already has this badge earned
    SELECT (earned_at IS NOT NULL) INTO v_already_earned
    FROM user_badges ub
    WHERE ub.user_id = p_user_id 
    AND ub.badge_id = v_badge.id;
    
    -- If no record found, they haven't earned it
    IF NOT FOUND THEN
      v_already_earned := FALSE;
    END IF;
    
    -- Calculate progress percentage
    DECLARE
      v_progress_pct INTEGER;
    BEGIN
      v_progress_pct := LEAST(100, (v_progress::FLOAT / v_badge.threshold * 100)::INTEGER);
      
      -- Insert or update the user badge record
      INSERT INTO user_badges (user_id, badge_id, progress, earned_at, progress_data)
      VALUES (
        p_user_id,
        v_badge.id,
        v_progress_pct,
        CASE WHEN v_earned THEN NOW() ELSE NULL END,
        jsonb_build_object('current', v_progress, 'threshold', v_badge.threshold)
      )
      ON CONFLICT (user_id, badge_id) DO UPDATE
      SET 
        progress = EXCLUDED.progress,
        progress_data = EXCLUDED.progress_data,
        earned_at = CASE 
          WHEN user_badges.earned_at IS NULL AND EXCLUDED.earned_at IS NOT NULL 
          THEN EXCLUDED.earned_at 
          ELSE user_badges.earned_at 
        END;
    END;
    
    -- If newly earned, return it and create notification
    IF v_earned AND NOT v_already_earned THEN
      out_badge_id := v_badge.id;
      out_badge_name := v_badge.name;
      out_newly_earned := true;
      RETURN NEXT;
      
      -- Create notification
      INSERT INTO badge_notifications (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 4. Simple trigger function
CREATE OR REPLACE FUNCTION trigger_badge_check() 
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Create triggers
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

-- 6. Enable RLS
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view criteria" ON badge_criteria FOR SELECT USING (true);
CREATE POLICY "Users view own actions" ON user_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own actions" ON user_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own notifications" ON badge_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON badge_notifications FOR UPDATE USING (auth.uid() = user_id);

-- 8. Quick test - check badges for first user
DO $$
DECLARE
  v_result RECORD;
  v_user_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Check their badges
    FOR v_result IN SELECT * FROM check_and_award_badges(v_user_id)
    LOOP
      RAISE NOTICE 'User % earned badge: %', v_user_id, v_result.out_badge_name;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Badge system ready! Badges will be awarded automatically.';
END $$;