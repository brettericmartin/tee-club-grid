-- ====================================================================
-- FIX PROFILE CREATION FOR WAITLIST WITHOUT AUTH
-- ====================================================================
-- Profiles table has a foreign key to auth.users which we need to handle
-- For waitlist users who haven't signed up yet, we can't create a profile
-- Instead, we'll track them in waitlist_applications only until they sign up
-- ====================================================================

-- Drop the problematic function that tries to create profiles without auth
DROP FUNCTION IF EXISTS create_profile_for_waitlist CASCADE;

-- Update the submit function to work without creating profiles for non-auth users
CREATE OR REPLACE FUNCTION submit_waitlist_with_profile(
  p_email TEXT,
  p_display_name TEXT,
  p_city_region TEXT,
  p_answers JSONB,
  p_score INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_beta_access BOOLEAN;
  v_beta_count INTEGER;
  v_result JSONB;
  v_status TEXT;
BEGIN
  -- Count current beta users
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- First 150 users get automatic beta access
  v_beta_access := (v_beta_count < 150);
  v_status := CASE WHEN v_beta_access THEN 'approved' ELSE 'pending' END;
  
  -- Check if profile already exists (user has signed up)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = lower(p_email);
  
  IF v_profile_id IS NOT NULL THEN
    -- Update existing profile with waitlist info
    UPDATE profiles
    SET 
      display_name = COALESCE(display_name, p_display_name),
      city_region = COALESCE(city_region, p_city_region),
      beta_access = v_beta_access,
      waitlist_submitted_at = COALESCE(waitlist_submitted_at, NOW()),
      beta_approved_at = CASE WHEN v_beta_access THEN COALESCE(beta_approved_at, NOW()) ELSE beta_approved_at END,
      invite_quota = CASE WHEN v_beta_access THEN GREATEST(invite_quota, 3) ELSE invite_quota END,
      referral_code = CASE 
        WHEN v_beta_access AND referral_code IS NULL THEN upper(substr(md5(random()::text), 1, 8))
        ELSE referral_code 
      END,
      updated_at = NOW()
    WHERE id = v_profile_id;
  END IF;
  
  -- Create or update waitlist application (always, even without profile)
  INSERT INTO waitlist_applications (
    email,
    display_name,
    city_region,
    answers,
    score,
    status,
    approved_at,
    created_at,
    updated_at
  ) VALUES (
    lower(p_email),
    p_display_name,
    p_city_region,
    p_answers,
    p_score,
    v_status,
    CASE WHEN v_beta_access THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    display_name = EXCLUDED.display_name,
    city_region = EXCLUDED.city_region,
    answers = EXCLUDED.answers,
    score = GREATEST(waitlist_applications.score, EXCLUDED.score),
    status = EXCLUDED.status,
    approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN COALESCE(waitlist_applications.approved_at, NOW()) ELSE waitlist_applications.approved_at END,
    updated_at = NOW();
  
  -- Build response
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'beta_access', v_beta_access,
    'beta_users_count', v_beta_count,
    'spots_remaining', GREATEST(0, 150 - v_beta_count),
    'message', CASE 
      WHEN v_beta_access THEN 'Welcome to Teed.club Beta! You have immediate access once you sign up.'
      ELSE 'You''re on the waitlist! We''ll notify you when a spot opens.'
    END
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_waitlist_with_profile TO anon, authenticated, service_role;

-- Create a trigger to handle profile creation when users sign up
-- This will check if they have a waitlist application and apply beta access
CREATE OR REPLACE FUNCTION apply_waitlist_status_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waitlist_app RECORD;
  v_beta_count INTEGER;
BEGIN
  -- Check if this user has a waitlist application
  SELECT * INTO v_waitlist_app
  FROM waitlist_applications
  WHERE email = NEW.email;
  
  IF v_waitlist_app IS NOT NULL THEN
    -- Count current beta users
    SELECT COUNT(*) INTO v_beta_count
    FROM profiles
    WHERE beta_access = true
    AND id != NEW.id;
    
    -- Update profile with waitlist info
    UPDATE profiles
    SET 
      display_name = COALESCE(NEW.display_name, v_waitlist_app.display_name),
      city_region = COALESCE(NEW.city_region, v_waitlist_app.city_region),
      beta_access = (v_waitlist_app.status = 'approved' OR v_beta_count < 150),
      waitlist_submitted_at = v_waitlist_app.created_at,
      beta_approved_at = CASE 
        WHEN v_waitlist_app.status = 'approved' THEN v_waitlist_app.approved_at
        WHEN v_beta_count < 150 THEN NOW()
        ELSE NULL
      END,
      invite_quota = CASE 
        WHEN v_waitlist_app.status = 'approved' OR v_beta_count < 150 THEN 3 
        ELSE 0 
      END,
      referral_code = CASE 
        WHEN (v_waitlist_app.status = 'approved' OR v_beta_count < 150) AND NEW.referral_code IS NULL 
        THEN upper(substr(md5(random()::text), 1, 8))
        ELSE NEW.referral_code
      END
    WHERE id = NEW.id;
    
    -- Update waitlist application status if they got beta access
    IF v_beta_count < 150 AND v_waitlist_app.status != 'approved' THEN
      UPDATE waitlist_applications
      SET 
        status = 'approved',
        approved_at = NOW()
      WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on profile inserts
DROP TRIGGER IF EXISTS apply_waitlist_on_profile_create ON profiles;
CREATE TRIGGER apply_waitlist_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION apply_waitlist_status_on_signup();

-- Also update the get_user_beta_status function to check waitlist_applications first
CREATE OR REPLACE FUNCTION get_user_beta_status(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profile RECORD;
  v_waitlist RECORD;
  v_beta_count INTEGER;
BEGIN
  -- First check waitlist application
  SELECT * INTO v_waitlist
  FROM waitlist_applications
  WHERE email = lower(p_email);
  
  IF v_waitlist IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'message', 'No application found'
    );
  END IF;
  
  -- Then check for profile (if user has signed up)
  SELECT 
    id,
    beta_access,
    is_admin,
    invite_quota,
    referral_code,
    beta_approved_at
  INTO v_profile
  FROM profiles
  WHERE email = lower(p_email);
  
  -- Get current beta count
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Build response based on what we found
  IF v_profile.id IS NOT NULL THEN
    -- User has signed up and has a profile
    v_result := jsonb_build_object(
      'status', CASE 
        WHEN v_profile.beta_access THEN 'approved'
        ELSE 'pending'
      END,
      'profile_id', v_profile.id,
      'is_admin', v_profile.is_admin,
      'invite_quota', v_profile.invite_quota,
      'referral_code', v_profile.referral_code,
      'beta_users_count', v_beta_count,
      'spots_remaining', GREATEST(0, 150 - v_beta_count),
      'approved_at', v_profile.beta_approved_at,
      'has_account', true
    );
  ELSE
    -- User has applied but hasn't signed up yet
    v_result := jsonb_build_object(
      'status', v_waitlist.status,
      'profile_id', NULL,
      'is_admin', false,
      'invite_quota', 0,
      'referral_code', NULL,
      'beta_users_count', v_beta_count,
      'spots_remaining', GREATEST(0, 150 - v_beta_count),
      'approved_at', v_waitlist.approved_at,
      'has_account', false,
      'message', 'Application received. Please sign up to access your account.'
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_beta_status TO anon, authenticated, service_role;

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PROFILE CREATION FIXED!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. Waitlist applications no longer require auth.users';
  RAISE NOTICE '2. Profile creation happens when user signs up';
  RAISE NOTICE '3. Beta access is applied automatically on signup';
  RAISE NOTICE '4. First 150 users still get automatic access';
  RAISE NOTICE '';
END $$;