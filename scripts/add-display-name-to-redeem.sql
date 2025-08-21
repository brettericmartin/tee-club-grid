-- Migration: Update redeem_invite_code_atomic to handle display_name
-- This ensures users get a proper display name when redeeming invite codes

-- Drop the existing functions (all overloads)
DROP FUNCTION IF EXISTS redeem_invite_code_atomic(text, uuid, text);
DROP FUNCTION IF EXISTS redeem_invite_code_atomic(text, uuid, text, text);
DROP FUNCTION IF EXISTS rpc_redeem_invite_code(text, text);
DROP FUNCTION IF EXISTS rpc_redeem_invite_code(text, text, text);

-- Recreate with display_name parameter
CREATE OR REPLACE FUNCTION redeem_invite_code_atomic(
  p_code text,
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_record record;
  v_already_has_access boolean;
  v_profile_exists boolean;
  v_beta_cap integer;
  v_approved_count integer;
  v_final_display_name text;
BEGIN
  -- Start with checking if user already has beta access (idempotent check)
  SELECT beta_access INTO v_already_has_access
  FROM profiles
  WHERE id = p_user_id;
  
  -- If user already has beta access, return success (idempotent)
  IF v_already_has_access IS TRUE THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_approved',
      'message', 'You already have beta access'
    );
  END IF;
  
  -- Lock and fetch the invite code record
  SELECT * INTO v_invite_record
  FROM invite_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;
  
  -- Check if invite code exists and is valid
  IF v_invite_record IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_code',
      'message', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Check if code has remaining uses
  IF v_invite_record.uses >= v_invite_record.max_uses THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'code_exhausted', 
      'message', 'This invite code has already been used the maximum number of times'
    );
  END IF;
  
  -- Check beta capacity
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1
  FOR UPDATE;
  
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true;
  
  IF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'at_capacity',
      'message', 'Beta is currently at capacity'
    );
  END IF;
  
  -- Increment the use count
  UPDATE invite_codes
  SET uses = uses + 1
  WHERE code = v_invite_record.code;
  
  -- Determine display name to use
  v_final_display_name := COALESCE(
    p_display_name,
    CASE 
      WHEN p_email IS NOT NULL THEN split_part(p_email, '@', 1)
      ELSE NULL
    END
  );
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE profiles
    SET 
      beta_access = true,
      display_name = COALESCE(display_name, v_final_display_name),
      email = COALESCE(email, p_email),
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Create new profile with beta access
    INSERT INTO profiles (id, beta_access, email, display_name, created_at, updated_at)
    VALUES (p_user_id, true, p_email, v_final_display_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      beta_access = true,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
      email = COALESCE(profiles.email, EXCLUDED.email),
      updated_at = NOW();
  END IF;
  
  -- Return success with invite code owner info if available
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'message', 'Successfully redeemed invite code! Welcome to Teed.club beta.',
    'inviteCodeOwner', v_invite_record.created_by_profile_id
  );
END;
$$;

-- Also create a wrapper for client-side calls with current user
CREATE OR REPLACE FUNCTION rpc_redeem_invite_code(
  p_code text,
  p_email text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the main function with the current user's ID
  RETURN redeem_invite_code_atomic(p_code, auth.uid(), p_email, p_display_name);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION redeem_invite_code_atomic TO service_role;
GRANT EXECUTE ON FUNCTION rpc_redeem_invite_code TO authenticated;