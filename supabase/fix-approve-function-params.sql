-- ====================================================================
-- FIX APPROVAL FUNCTION PARAMETER NAMES
-- ====================================================================
-- The API is calling with p_email but function expects user_email
-- ====================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text);
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text, text, boolean);

-- Create function with correct parameters matching the API call
CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(
  p_email text,
  p_display_name text DEFAULT NULL,
  p_grant_invites boolean DEFAULT true
)
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
  v_invite_codes jsonb := '[]'::jsonb;
BEGIN
  -- Normalize email
  p_email := LOWER(TRIM(p_email));

  -- Check capacity
  SELECT COUNT(*) INTO v_current_count
  FROM profiles
  WHERE beta_access = true;
  
  IF v_current_count >= v_max_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'at_capacity',
      'message', format('Beta is at capacity (%s/%s)', v_current_count, v_max_capacity),
      'current_count', v_current_count,
      'max_capacity', v_max_capacity
    );
  END IF;
  
  -- Get the waitlist application
  SELECT * INTO v_application
  FROM waitlist_applications
  WHERE LOWER(email) = p_email
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_application IS NULL THEN
    -- Check if already approved
    SELECT * INTO v_application
    FROM waitlist_applications
    WHERE LOWER(email) = p_email
      AND status = 'approved'
    LIMIT 1;
    
    IF v_application IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'already_approved',
        'message', 'Application already approved'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'No pending application found for this email'
    );
  END IF;
  
  -- Check if user exists in auth.users
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE LOWER(email) = p_email
  LIMIT 1;
  
  IF v_auth_user IS NULL THEN
    -- User hasn't signed up yet, just approve the application
    UPDATE waitlist_applications
    SET 
      status = 'approved',
      approved_at = NOW()
    WHERE id = v_application.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Application approved. User will get beta access when they sign up.',
      'applicationId', v_application.id
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
      display_name = COALESCE(profiles.display_name, p_display_name, v_application.display_name),
      invite_quota = CASE 
        WHEN p_grant_invites THEN GREATEST(COALESCE(profiles.invite_quota, 0), 3)
        ELSE COALESCE(profiles.invite_quota, 0)
      END
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
        p_display_name,
        v_application.display_name,
        v_auth_user.raw_user_meta_data->>'full_name',
        split_part(v_auth_user.email, '@', 1)
      ),
      true,
      CASE WHEN p_grant_invites THEN 3 ELSE 0 END,
      0,
      COALESCE(v_application.referral_code, UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))),
      NOW()
    );
  END IF;
  
  -- Update the waitlist application
  UPDATE waitlist_applications
  SET 
    status = 'approved',
    approved_at = NOW()
  WHERE id = v_application.id;
  
  -- If granting invites, generate invite codes
  IF p_grant_invites THEN
    -- This would normally generate invite codes
    -- For now, just return empty array
    v_invite_codes := '[]'::jsonb;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User approved successfully',
    'profileId', v_auth_user.id,
    'email', p_email,
    'inviteCodes', v_invite_codes,
    'beta_count', v_current_count + 1
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return detailed error for debugging
  RETURN jsonb_build_object(
    'success', false,
    'error', 'database_error',
    'message', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text, text, boolean) TO anon;

-- Test the function exists
SELECT 
  'approve_user_by_email_if_capacity' as function_name,
  COUNT(*) as overload_count
FROM pg_proc
WHERE proname = 'approve_user_by_email_if_capacity';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ APPROVAL FUNCTION UPDATED WITH CORRECT PARAMETERS!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Function now accepts: p_email, p_display_name, p_grant_invites';
  RAISE NOTICE 'Matches the API call parameters';
  RAISE NOTICE '';
END $$;