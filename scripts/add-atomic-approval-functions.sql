-- Migration: Add atomic approval functions with capacity locking
-- This ensures thread-safe capacity management at the database level

-- Function to approve a user with atomic capacity check
CREATE OR REPLACE FUNCTION approve_user_if_capacity(
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_beta_cap integer;
  v_approved_count integer;
  v_current_display_name text;
BEGIN
  -- Start transaction block with proper isolation
  -- Lock the feature_flags row to prevent concurrent modifications
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1
  FOR UPDATE;
  
  -- If no feature flags row exists, create default
  IF v_beta_cap IS NULL THEN
    INSERT INTO feature_flags (id, beta_cap, public_beta_enabled)
    VALUES (1, 150, false)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT beta_cap INTO v_beta_cap
    FROM feature_flags
    WHERE id = 1
    FOR UPDATE;
  END IF;
  
  -- Count currently approved users
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Check capacity
  IF v_approved_count >= v_beta_cap THEN
    RAISE EXCEPTION 'at_capacity' 
      USING DETAIL = format('Beta is at capacity (%s/%s)', v_approved_count, v_beta_cap),
            HINT = 'Cannot approve more users until capacity is increased';
  END IF;
  
  -- Get current display name
  SELECT display_name INTO v_current_display_name
  FROM profiles
  WHERE id = p_user_id;
  
  -- Update the user's profile with beta access
  UPDATE profiles
  SET 
    beta_access = true,
    display_name = COALESCE(display_name, p_display_name),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    -- Profile doesn't exist, create it
    INSERT INTO profiles (id, beta_access, display_name, created_at, updated_at)
    VALUES (p_user_id, true, p_display_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      beta_access = true,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
      updated_at = NOW();
  END IF;
  
  -- Log the approval for audit
  RAISE NOTICE 'User % approved for beta access (capacity: %/%)', 
    p_user_id, v_approved_count + 1, v_beta_cap;
  
  RETURN true;
END;
$$;

-- RPC wrapper for self-approval (used in auto-approval flow)
CREATE OR REPLACE FUNCTION rpc_approve_self_if_capacity(
  display_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result boolean;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING DETAIL = 'User must be authenticated to approve themselves';
  END IF;
  
  -- Call the main approval function
  v_result := approve_user_if_capacity(v_user_id, display_name);
  
  RETURN v_result;
END;
$$;

-- Function to approve by email (for admin approval)
CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(
  p_email text,
  p_display_name text DEFAULT NULL,
  p_grant_invites boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_beta_cap integer;
  v_approved_count integer;
  v_invite_codes text[];
BEGIN
  -- Lock feature flags for capacity check
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1
  FOR UPDATE;
  
  -- Count approved users
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Check capacity
  IF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'at_capacity',
      'message', format('Beta is at capacity (%s/%s)', v_approved_count, v_beta_cap)
    );
  END IF;
  
  -- Find or create profile by email
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = lower(p_email);
  
  IF v_profile_id IS NULL THEN
    -- Create new profile
    INSERT INTO profiles (email, display_name, beta_access, invite_quota, created_at)
    VALUES (
      lower(p_email),
      COALESCE(p_display_name, split_part(p_email, '@', 1)),
      true,
      CASE WHEN p_grant_invites THEN 3 ELSE 0 END,
      NOW()
    )
    RETURNING id INTO v_profile_id;
  ELSE
    -- Update existing profile
    UPDATE profiles
    SET 
      beta_access = true,
      display_name = COALESCE(display_name, p_display_name),
      invite_quota = CASE 
        WHEN p_grant_invites AND invite_quota = 0 THEN 3 
        ELSE invite_quota 
      END,
      updated_at = NOW()
    WHERE id = v_profile_id;
  END IF;
  
  -- Update waitlist application if exists
  UPDATE waitlist_applications
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid()
  WHERE email = lower(p_email) AND status = 'pending';
  
  -- Generate invite codes if requested
  IF p_grant_invites THEN
    v_invite_codes := ARRAY[]::text[];
    FOR i IN 1..3 LOOP
      v_invite_codes := array_append(v_invite_codes, generate_invite_code());
    END LOOP;
    
    -- Insert invite codes
    INSERT INTO invite_codes (code, created_by, max_uses, uses, active, note)
    SELECT 
      unnest(v_invite_codes),
      v_profile_id,
      1,
      0,
      true,
      format('Auto-generated for %s', p_email);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'profileId', v_profile_id,
    'inviteCodes', v_invite_codes,
    'message', format('Successfully approved %s for beta access', p_email)
  );
END;
$$;

-- Helper function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code text := '';
  v_length integer := 8;
  v_random_index integer;
BEGIN
  FOR i IN 1..v_length LOOP
    IF i = 5 THEN
      v_code := v_code || '-';
    END IF;
    v_random_index := floor(random() * length(v_chars) + 1)::integer;
    v_code := v_code || substr(v_chars, v_random_index, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invite_codes WHERE code = v_code) LOOP
    v_code := generate_invite_code();
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to check if auto-approval is possible
CREATE OR REPLACE FUNCTION check_auto_approval_eligibility(
  p_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_beta_cap integer;
  v_approved_count integer;
  v_auto_approve_threshold integer := 4;
BEGIN
  -- Get current capacity
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1;
  
  IF v_beta_cap IS NULL THEN
    v_beta_cap := 150; -- Default
  END IF;
  
  -- Count approved users
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Check eligibility
  IF p_score >= v_auto_approve_threshold AND v_approved_count < v_beta_cap THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', 'high_score',
      'capacity_remaining', v_beta_cap - v_approved_count
    );
  ELSIF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'at_capacity',
      'capacity_remaining', 0
    );
  ELSE
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'score_too_low',
      'capacity_remaining', v_beta_cap - v_approved_count,
      'score_needed', v_auto_approve_threshold
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_user_if_capacity TO service_role;
GRANT EXECUTE ON FUNCTION rpc_approve_self_if_capacity TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity TO service_role;
GRANT EXECUTE ON FUNCTION generate_invite_code TO service_role;
GRANT EXECUTE ON FUNCTION check_auto_approval_eligibility TO anon, authenticated;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access) WHERE beta_access = true;

-- Add comment documentation
COMMENT ON FUNCTION approve_user_if_capacity IS 
'Atomically approves a user for beta access with capacity check and row locking to prevent race conditions';

COMMENT ON FUNCTION rpc_approve_self_if_capacity IS 
'RPC wrapper for authenticated users to approve themselves (used in auto-approval flow)';

COMMENT ON FUNCTION approve_user_by_email_if_capacity IS 
'Admin function to approve users by email with optional invite code generation';

COMMENT ON FUNCTION check_auto_approval_eligibility IS 
'Check if a user with given score is eligible for auto-approval based on capacity';