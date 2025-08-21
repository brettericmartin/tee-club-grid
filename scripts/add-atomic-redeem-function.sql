-- Migration: Add atomic invite code redemption function
-- This ensures thread-safe redemption with proper locking and idempotency

-- Function to atomically redeem an invite code
CREATE OR REPLACE FUNCTION redeem_invite_code_atomic(
  p_code text,
  p_user_id uuid,
  p_email text DEFAULT NULL
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
  
  -- Check if invite code has uses remaining
  IF v_invite_record.uses >= v_invite_record.max_uses THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'code_exhausted',
      'message', 'This invite code has already been used'
    );
  END IF;
  
  -- Check current capacity before granting access
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1
  FOR UPDATE;
  
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Check if at capacity
  IF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'at_capacity',
      'message', format('Beta is at capacity (%s/%s)', v_approved_count, v_beta_cap)
    );
  END IF;
  
  -- Increment the uses count on the invite code
  UPDATE invite_codes
  SET 
    uses = uses + 1,
    last_used_at = NOW(),
    last_used_by = p_user_id
  WHERE id = v_invite_record.id;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = p_user_id
  ) INTO v_profile_exists;
  
  -- Grant beta access to the user
  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE profiles
    SET 
      beta_access = true,
      invite_code_used = p_code,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Create new profile with beta access
    INSERT INTO profiles (
      id,
      email,
      beta_access,
      invite_code_used,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      COALESCE(p_email, 'user_' || p_user_id::text || '@example.com'),
      true,
      p_code,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Log the redemption
  RAISE NOTICE 'Invite code % redeemed by user %', p_code, p_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'message', 'Invite code redeemed successfully! Welcome to Teed.club beta.',
    'inviteCodeOwner', v_invite_record.created_by
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE WARNING 'Error redeeming invite code %: %', p_code, SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$;

-- RPC wrapper for authenticated users
CREATE OR REPLACE FUNCTION rpc_redeem_invite_code(
  code text,
  email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated',
      'message', 'You must be signed in to redeem an invite code'
    );
  END IF;
  
  -- Call the main redemption function
  v_result := redeem_invite_code_atomic(code, v_user_id, email);
  
  RETURN v_result;
END;
$$;

-- Function to validate invite code without redeeming
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_invite_record record;
  v_beta_cap integer;
  v_approved_count integer;
BEGIN
  -- Fetch the invite code record (no lock needed for validation)
  SELECT * INTO v_invite_record
  FROM invite_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Check if invite code exists
  IF v_invite_record IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'message', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Check if invite code has uses remaining
  IF v_invite_record.uses >= v_invite_record.max_uses THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'code_exhausted',
      'message', 'This invite code has already been used',
      'uses', v_invite_record.uses,
      'maxUses', v_invite_record.max_uses
    );
  END IF;
  
  -- Check current capacity
  SELECT beta_cap INTO v_beta_cap FROM feature_flags WHERE id = 1;
  SELECT COUNT(*) INTO v_approved_count FROM profiles WHERE beta_access = true;
  
  IF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'at_capacity',
      'message', 'Beta is currently at capacity',
      'capacity', v_beta_cap,
      'approved', v_approved_count
    );
  END IF;
  
  -- Code is valid
  RETURN jsonb_build_object(
    'valid', true,
    'code', v_invite_record.code,
    'usesRemaining', v_invite_record.max_uses - v_invite_record.uses,
    'createdBy', v_invite_record.created_by,
    'note', v_invite_record.note
  );
END;
$$;

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add invite_code_used to profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'invite_code_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invite_code_used text;
  END IF;
  
  -- Add last_used_at to invite_codes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invite_codes' 
    AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE invite_codes ADD COLUMN last_used_at timestamptz;
  END IF;
  
  -- Add last_used_by to invite_codes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invite_codes' 
    AND column_name = 'last_used_by'
  ) THEN
    ALTER TABLE invite_codes ADD COLUMN last_used_by uuid REFERENCES profiles(id);
  END IF;
  
  -- Add expires_at to invite_codes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invite_codes' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE invite_codes ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION redeem_invite_code_atomic TO service_role;
GRANT EXECUTE ON FUNCTION rpc_redeem_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code TO anon, authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_code_active 
  ON invite_codes(UPPER(code)) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_invite_codes_expires 
  ON invite_codes(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_invite_code_used 
  ON profiles(invite_code_used) 
  WHERE invite_code_used IS NOT NULL;

-- Add comments for documentation
COMMENT ON FUNCTION redeem_invite_code_atomic IS 
'Atomically redeems an invite code with proper locking, idempotency, and capacity checks';

COMMENT ON FUNCTION rpc_redeem_invite_code IS 
'RPC wrapper for authenticated users to redeem invite codes';

COMMENT ON FUNCTION validate_invite_code IS 
'Validates an invite code without redeeming it, useful for UI feedback';