-- Fix Beta System Functions
-- Run this in Supabase Dashboard SQL Editor

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_auto_approval_eligibility(integer);
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text, text, boolean);

-- Recreate functions with correct signatures
CREATE OR REPLACE FUNCTION check_auto_approval_eligibility(p_score INTEGER)
RETURNS TABLE(eligible BOOLEAN)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_score >= 75 THEN true
      ELSE false
    END as eligible;
END;
$$;

CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(
  p_email TEXT,
  p_display_name TEXT,
  p_grant_invites BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_beta_cap INTEGER;
  v_current_approved INTEGER;
  v_profile_id UUID;
  v_result JSON;
BEGIN
  -- Get current beta cap
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1;
  
  -- Count current approved users (excluding soft-deleted)
  SELECT COUNT(*) INTO v_current_approved
  FROM profiles
  WHERE beta_access = true
  AND deleted_at IS NULL;
  
  -- Check capacity
  IF v_current_approved >= v_beta_cap THEN
    RETURN json_build_object(
      'success', false,
      'message', 'at_capacity'
    );
  END IF;
  
  -- Create or update profile
  INSERT INTO profiles (id, email, display_name, beta_access, invite_quota, invites_sent, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    p_email,
    p_display_name,
    true,
    CASE WHEN p_grant_invites THEN 3 ELSE 0 END,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    beta_access = true,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    invite_quota = CASE WHEN p_grant_invites THEN GREATEST(profiles.invite_quota, 3) ELSE profiles.invite_quota END,
    updated_at = NOW()
  RETURNING id INTO v_profile_id;
  
  -- Generate referral code if not exists
  UPDATE profiles
  SET referral_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
  WHERE id = v_profile_id
  AND referral_code IS NULL;
  
  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'message', 'approved'
  );
END;
$$;

-- Verify functions exist
SELECT 
  proname as function_name,
  pronargs as arg_count
FROM pg_proc 
WHERE proname IN ('check_auto_approval_eligibility', 'approve_user_by_email_if_capacity')
ORDER BY proname;