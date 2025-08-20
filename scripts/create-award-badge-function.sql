-- Create function to award the Tour Champion badge
CREATE OR REPLACE FUNCTION award_onboarding_badge(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_badge_id UUID;
  v_already_earned BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get badge ID for Tour Champion
  SELECT id INTO v_badge_id 
  FROM badges 
  WHERE name = 'Tour Champion';
  
  IF v_badge_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Badge not found');
  END IF;
  
  -- Check if already earned
  SELECT EXISTS(
    SELECT 1 FROM user_badges 
    WHERE user_id = p_user_id AND badge_id = v_badge_id
  ) INTO v_already_earned;
  
  IF v_already_earned THEN
    RETURN jsonb_build_object('success', false, 'error', 'Badge already earned');
  END IF;
  
  -- Award badge
  INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
  VALUES (p_user_id, v_badge_id, NOW(), 100)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  
  -- Create notification
  INSERT INTO badge_notifications (user_id, badge_id)
  VALUES (p_user_id, v_badge_id)
  ON CONFLICT DO NOTHING;
  
  -- Update profile if column exists
  -- Using dynamic SQL to handle case where column might not exist
  BEGIN
    EXECUTE 'UPDATE profiles SET onboarding_completed = true, onboarding_completed_at = NOW() WHERE id = $1' USING p_user_id;
  EXCEPTION WHEN undefined_column THEN
    -- Column doesn't exist, continue anyway
    NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true, 
    'badge_id', v_badge_id,
    'badge_name', 'Tour Champion',
    'message', 'Congratulations! You earned the Tour Champion badge!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_onboarding_badge TO authenticated;

-- Add comment
COMMENT ON FUNCTION award_onboarding_badge IS 'Awards the Tour Champion badge to a user upon completing onboarding';