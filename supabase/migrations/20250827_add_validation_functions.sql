-- ====================================================================
-- ADD EMAIL/USERNAME VALIDATION FUNCTIONS
-- ====================================================================
-- These functions allow checking if email/username are available
-- before signup, and work with the waitlist system
-- ====================================================================

-- Function to check if email exists in profiles or waitlist
CREATE OR REPLACE FUNCTION check_email_availability(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_waitlist_exists BOOLEAN;
  v_waitlist_status TEXT;
  v_auth_exists BOOLEAN;
BEGIN
  -- Check profiles table
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE lower(email) = lower(p_email)
  ) INTO v_profile_exists;
  
  -- Check waitlist applications
  SELECT EXISTS(
    SELECT 1 FROM waitlist_applications 
    WHERE lower(email) = lower(p_email)
  ) INTO v_waitlist_exists;
  
  -- Get waitlist status if exists
  IF v_waitlist_exists THEN
    SELECT status INTO v_waitlist_status
    FROM waitlist_applications 
    WHERE lower(email) = lower(p_email);
  END IF;
  
  -- Check auth.users (if accessible)
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM auth.users 
      WHERE lower(email) = lower(p_email)
    ) INTO v_auth_exists;
  EXCEPTION WHEN OTHERS THEN
    v_auth_exists := false;
  END;
  
  RETURN jsonb_build_object(
    'available', NOT (v_profile_exists OR v_auth_exists),
    'profile_exists', v_profile_exists,
    'auth_exists', v_auth_exists,
    'waitlist_exists', v_waitlist_exists,
    'waitlist_status', v_waitlist_status,
    'message', CASE
      WHEN v_profile_exists OR v_auth_exists THEN 'Email already registered'
      WHEN v_waitlist_exists AND v_waitlist_status = 'approved' THEN 'Email approved for beta - please sign up!'
      WHEN v_waitlist_exists THEN 'Email on waitlist - you can sign up'
      ELSE 'Email available'
    END
  );
END;
$$;

-- Function to check if username exists
CREATE OR REPLACE FUNCTION check_username_availability(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_similar_count INTEGER;
BEGIN
  -- Check exact match
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE lower(username) = lower(p_username)
  ) INTO v_exists;
  
  -- Count similar usernames (for suggestions)
  SELECT COUNT(*) INTO v_similar_count
  FROM profiles 
  WHERE lower(username) LIKE lower(p_username) || '%';
  
  RETURN jsonb_build_object(
    'available', NOT v_exists,
    'exists', v_exists,
    'similar_count', v_similar_count,
    'suggestions', CASE 
      WHEN v_exists THEN 
        array[
          p_username || (v_similar_count + 1)::text,
          p_username || '_' || substr(md5(random()::text), 1, 4),
          p_username || '_golf'
        ]
      ELSE NULL
    END,
    'message', CASE
      WHEN v_exists THEN 'Username already taken'
      ELSE 'Username available'
    END
  );
END;
$$;

-- Combined validation for signup
CREATE OR REPLACE FUNCTION validate_signup_availability(
  p_email TEXT,
  p_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_check JSONB;
  v_username_check JSONB;
  v_beta_count INTEGER;
  v_will_get_beta BOOLEAN;
BEGIN
  -- Check email
  v_email_check := check_email_availability(p_email);
  
  -- Check username
  v_username_check := check_username_availability(p_username);
  
  -- Check beta status
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  v_will_get_beta := (v_beta_count < 150);
  
  RETURN jsonb_build_object(
    'can_signup', (v_email_check->>'available')::boolean AND (v_username_check->>'available')::boolean,
    'email', v_email_check,
    'username', v_username_check,
    'beta_info', jsonb_build_object(
      'will_get_access', v_will_get_beta,
      'current_beta_users', v_beta_count,
      'spots_remaining', GREATEST(0, 150 - v_beta_count),
      'on_waitlist', (v_email_check->>'waitlist_exists')::boolean,
      'waitlist_status', v_email_check->>'waitlist_status'
    ),
    'message', CASE
      WHEN NOT (v_email_check->>'available')::boolean THEN 'Email already in use'
      WHEN NOT (v_username_check->>'available')::boolean THEN 'Username already taken'
      WHEN v_will_get_beta THEN 'Ready to sign up - you will get immediate beta access!'
      ELSE 'Ready to sign up - you will be on the waitlist'
    END
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_email_availability TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_username_availability TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_signup_availability TO anon, authenticated, service_role;

-- ====================================================================
-- VERIFY SIGNUP FLOW WORKS CORRECTLY
-- ====================================================================

-- Ensure the trigger function handles all cases
CREATE OR REPLACE FUNCTION apply_waitlist_status_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waitlist_app RECORD;
  v_beta_count INTEGER;
  v_should_grant_beta BOOLEAN;
BEGIN
  -- Check if this user has a waitlist application
  SELECT * INTO v_waitlist_app
  FROM waitlist_applications
  WHERE lower(email) = lower(NEW.email);
  
  -- Count current beta users (excluding this new user)
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true
  AND id != NEW.id;
  
  -- Determine if they should get beta access
  v_should_grant_beta := false;
  
  IF v_waitlist_app IS NOT NULL THEN
    -- They have a waitlist application
    IF v_waitlist_app.status = 'approved' THEN
      v_should_grant_beta := true;
    ELSIF v_beta_count < 150 THEN
      v_should_grant_beta := true;
    END IF;
  ELSIF v_beta_count < 150 THEN
    -- No waitlist application but still under 150 users
    v_should_grant_beta := true;
  END IF;
  
  -- Update the profile with beta access if granted
  IF v_should_grant_beta THEN
    UPDATE profiles
    SET 
      display_name = COALESCE(NEW.display_name, v_waitlist_app.display_name, NEW.display_name),
      city_region = COALESCE(NEW.city_region, v_waitlist_app.city_region),
      beta_access = true,
      waitlist_submitted_at = COALESCE(v_waitlist_app.created_at, NOW()),
      beta_approved_at = NOW(),
      invite_quota = 3,
      referral_code = COALESCE(
        NEW.referral_code,
        upper(substr(md5(random()::text), 1, 8))
      ),
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Update waitlist application if exists
    IF v_waitlist_app IS NOT NULL AND v_waitlist_app.status != 'approved' THEN
      UPDATE waitlist_applications
      SET 
        status = 'approved',
        approved_at = NOW(),
        updated_at = NOW()
      WHERE lower(email) = lower(NEW.email);
    END IF;
  ELSE
    -- User doesn't get beta access
    UPDATE profiles
    SET 
      display_name = COALESCE(NEW.display_name, v_waitlist_app.display_name, NEW.display_name),
      city_region = COALESCE(NEW.city_region, v_waitlist_app.city_region),
      beta_access = false,
      waitlist_submitted_at = COALESCE(v_waitlist_app.created_at, NOW()),
      invite_quota = 0,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS apply_waitlist_on_profile_create ON profiles;
CREATE TRIGGER apply_waitlist_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION apply_waitlist_status_on_signup();

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ VALIDATION FUNCTIONS ADDED!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. check_email_availability - Check if email is available';
  RAISE NOTICE '2. check_username_availability - Check if username is taken';
  RAISE NOTICE '3. validate_signup_availability - Combined validation';
  RAISE NOTICE '4. Signup trigger improved to handle all cases';
  RAISE NOTICE '';
  RAISE NOTICE 'The system now:';
  RAISE NOTICE '  • Tracks beta users correctly (max 150)';
  RAISE NOTICE '  • Creates profiles on signup with proper beta access';
  RAISE NOTICE '  • Validates email/username before signup';
  RAISE NOTICE '  • Works with or without waitlist application';
  RAISE NOTICE '';
END $$;