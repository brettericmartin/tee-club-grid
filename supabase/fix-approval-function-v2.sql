-- ====================================================================
-- FIX APPROVAL FUNCTION TO WORK WITH EXISTING COLUMNS
-- ====================================================================

-- Drop and recreate the function to match actual table structure
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text);

CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(user_email text)
RETURNS jsonb
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_application record;
  v_current_count integer;
  v_max_capacity integer := 100;
  v_auth_user record;
  v_profile_exists boolean;
BEGIN
  -- Check capacity
  SELECT COUNT(*) INTO v_current_count
  FROM profiles
  WHERE beta_access = true;
  
  IF v_current_count >= v_max_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Beta is at capacity',
      'current_count', v_current_count,
      'max_capacity', v_max_capacity
    );
  END IF;
  
  -- Get the waitlist application
  SELECT * INTO v_application
  FROM waitlist_applications
  WHERE email = user_email
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_application IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No pending application found for this email'
    );
  END IF;
  
  -- Check if user exists in auth.users
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF v_auth_user IS NULL THEN
    -- User hasn't signed up yet, just approve the application
    -- Note: Using only columns that exist in waitlist_applications
    UPDATE waitlist_applications
    SET 
      status = 'approved',
      approved_at = NOW()
    WHERE id = v_application.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Application approved. User will get beta access when they sign up.',
      'application_id', v_application.id
    );
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = v_auth_user.id
  ) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE profiles
    SET 
      beta_access = true,
      email = COALESCE(profiles.email, v_auth_user.email),
      display_name = COALESCE(profiles.display_name, v_application.display_name),
      invite_quota = GREATEST(COALESCE(profiles.invite_quota, 0), 3)
    WHERE id = v_auth_user.id;
  ELSE
    -- Create new profile with all required fields
    INSERT INTO profiles (
      id,
      email,
      username,
      display_name,
      beta_access,
      invite_quota,
      invites_sent,
      referral_code,
      created_at
    ) VALUES (
      v_auth_user.id,
      v_auth_user.email,
      COALESCE(
        v_auth_user.raw_user_meta_data->>'username',
        split_part(v_auth_user.email, '@', 1)
      ),
      COALESCE(
        v_application.display_name,
        v_auth_user.raw_user_meta_data->>'full_name',
        split_part(v_auth_user.email, '@', 1)
      ),
      true,
      3,
      0,
      COALESCE(v_application.referral_code, UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))),
      NOW()
    );
  END IF;
  
  -- Update the waitlist application (only using existing columns)
  UPDATE waitlist_applications
  SET 
    status = 'approved',
    approved_at = NOW()
  WHERE id = v_application.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User approved successfully',
    'user_id', v_auth_user.id,
    'email', user_email,
    'beta_count', v_current_count + 1
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return detailed error for debugging
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error: ' || SQLERRM,
    'detail', SQLSTATE,
    'hint', SQLERRM
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO service_role;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO anon;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ APPROVAL FUNCTION UPDATED!';
  RAISE NOTICE '==============================';
  RAISE NOTICE 'Function now works with existing columns';
  RAISE NOTICE 'Removed reference to updated_at column';
  RAISE NOTICE '';
END $$;