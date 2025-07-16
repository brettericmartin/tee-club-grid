-- Fix the check_and_award_badges function to handle brand_equipment criteria
-- and fix the ambiguous badge_id reference

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  badge_name TEXT,
  newly_earned BOOLEAN
) AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_earned BOOLEAN;
  v_newly_earned BOOLEAN;
BEGIN
  -- Check each active badge
  FOR v_badge IN 
    SELECT b.id, b.name, bc.criteria_type, bc.threshold, bc.parameters
    FROM badges b
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE b.is_active = true
  LOOP
    v_progress := 0;
    v_earned := false;
    
    -- Calculate progress based on criteria type
    CASE v_badge.criteria_type
      WHEN 'equipment_count' THEN
        SELECT COUNT(DISTINCT be.equipment_id) INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'unique_brands' THEN
        SELECT COUNT(DISTINCT e.brand) INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'brand_equipment' THEN
        -- Check if user has equipment from specific brand
        SELECT COUNT(DISTINCT be.equipment_id) INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id
        AND e.brand = v_badge.parameters->>'brand';
        
      WHEN 'tees_received' THEN
        SELECT COUNT(*) INTO v_progress
        FROM bag_likes bl
        JOIN user_bags ub ON bl.bag_id = ub.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'reviews_written' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment_reviews
        WHERE user_id = p_user_id;
        
      WHEN 'photos_uploaded' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment_photos
        WHERE uploaded_by = p_user_id;
        
      WHEN 'equipment_value' THEN
        SELECT COALESCE(SUM(e.msrp), 0)::INTEGER INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'profile_complete' THEN
        SELECT 
          CASE 
            WHEN p.full_name IS NOT NULL 
              AND p.avatar_url IS NOT NULL 
              AND p.bio IS NOT NULL 
              AND p.location IS NOT NULL 
              AND p.handicap IS NOT NULL 
            THEN 100 
            ELSE 0 
          END INTO v_progress
        FROM profiles p
        WHERE p.id = p_user_id;
        
      WHEN 'join_date' THEN
        SELECT 
          CASE 
            WHEN EXTRACT(EPOCH FROM (NOW() - p.created_at))/86400 <= (v_badge.parameters->>'within_days')::INTEGER
            THEN 100
            ELSE 0
          END INTO v_progress
        FROM profiles p
        WHERE p.id = p_user_id;
    END CASE;
    
    -- Check if badge is earned
    IF v_progress >= v_badge.threshold THEN
      v_earned := true;
      
      -- Insert or update user badge
      INSERT INTO user_badges (user_id, badge_id, progress)
      VALUES (p_user_id, v_badge.id, 100)
      ON CONFLICT (user_id, badge_id) 
      DO UPDATE SET progress = 100
      WHERE user_badges.progress < 100
      RETURNING true INTO v_newly_earned;
      
      -- Create notification if newly earned
      IF v_newly_earned THEN
        INSERT INTO badge_notifications (user_id, badge_id)
        VALUES (p_user_id, v_badge.id);
      END IF;
    ELSE
      -- Update progress
      INSERT INTO user_badges (user_id, badge_id, progress)
      VALUES (p_user_id, v_badge.id, LEAST((v_progress * 100 / v_badge.threshold), 99))
      ON CONFLICT (user_id, badge_id) 
      DO UPDATE SET progress = LEAST((v_progress * 100 / v_badge.threshold), 99);
      
      v_newly_earned := false;
    END IF;
    
    RETURN QUERY SELECT v_badge.id, v_badge.name, COALESCE(v_newly_earned, false);
  END LOOP;
END;
$$ LANGUAGE plpgsql;