-- ====================================================================
-- FIX INVITE SYSTEM WITH ACTUAL SCHEMA
-- ====================================================================
-- Based on ACTUAL database inspection, not assumptions
-- ====================================================================

-- Step 1: The invite_codes table already exists with proper columns
-- Just ensure the constraints are correct
-- ====================================================================
ALTER TABLE invite_codes 
ALTER COLUMN is_active SET DEFAULT true;

-- Ensure unique constraint on code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invite_codes_code_key'
  ) THEN
    ALTER TABLE invite_codes 
    ADD CONSTRAINT invite_codes_code_key UNIQUE (code);
  END IF;
END $$;

-- Step 2: Create or replace functions with CORRECT column names
-- ====================================================================
CREATE OR REPLACE FUNCTION generate_invite_codes(p_user_id UUID, p_count INTEGER DEFAULT 3)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_codes TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  -- Check if user has beta access
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND beta_access = true
  ) THEN
    RAISE EXCEPTION 'User does not have beta access';
  END IF;
  
  -- Generate the requested number of codes
  FOR i IN 1..p_count LOOP
    -- Generate a unique 8-character code
    LOOP
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = v_code);
    END LOOP;
    
    -- Insert the code with ACTUAL columns
    INSERT INTO invite_codes (
      code,
      created_by,
      expires_at,
      is_active,
      max_uses,
      uses_count,
      status,
      created_at
    ) VALUES (
      v_code,
      p_user_id,
      NOW() + INTERVAL '30 days',
      true,
      1,  -- Single use codes
      0,
      'active',
      NOW()
    );
    
    v_codes := array_append(v_codes, v_code);
  END LOOP;
  
  -- Update user's invite quota (column exists, confirmed)
  UPDATE profiles
  SET 
    invite_quota = GREATEST(0, invite_quota - p_count),
    invites_sent = COALESCE(invites_sent, 0) + p_count
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT unnest(v_codes);
END;
$$;

-- Step 3: Function to redeem invite code with ACTUAL columns
-- ====================================================================
CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_beta_count INTEGER;
  v_result JSONB;
BEGIN
  -- Validate the invite code using ACTUAL columns
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE upper(code) = upper(p_code)
  AND is_active = true
  AND (uses_count < max_uses OR max_uses IS NULL)
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Check current beta count
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Update the invite code usage
  UPDATE invite_codes
  SET 
    uses_count = uses_count + 1,
    used_at = NOW(),
    status = CASE 
      WHEN uses_count + 1 >= max_uses THEN 'exhausted'
      ELSE 'active'
    END,
    is_active = CASE 
      WHEN uses_count + 1 >= max_uses THEN false
      ELSE true
    END
  WHERE id = v_invite.id;
  
  -- Create or update waitlist application with ACTUAL columns
  INSERT INTO waitlist_applications (
    email,
    status,
    approved_at,
    invite_code,  -- This column exists
    created_at,
    updated_at
  ) VALUES (
    lower(p_email),
    'approved',
    NOW(),
    p_code,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    status = 'approved',
    approved_at = COALESCE(waitlist_applications.approved_at, NOW()),
    invite_code = COALESCE(waitlist_applications.invite_code, EXCLUDED.invite_code),
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invite code redeemed! You have beta access.',
    'beta_count', v_beta_count,
    'invite_code', p_code
  );
END;
$$;

-- Step 4: Function to get user's invite codes with ACTUAL columns
-- ====================================================================
CREATE OR REPLACE FUNCTION get_my_invite_codes(p_user_id UUID)
RETURNS TABLE (
  code TEXT,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.code,
    p.email as used_by,
    ic.used_at,
    ic.expires_at,
    ic.is_active,
    ic.status
  FROM invite_codes ic
  LEFT JOIN profiles p ON p.id = ic.used_by
  WHERE ic.created_by = p_user_id
  ORDER BY ic.created_at DESC;
END;
$$;

-- Step 5: Update trigger to check for invite codes properly
-- ====================================================================
CREATE OR REPLACE FUNCTION apply_waitlist_status_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waitlist_app RECORD;
  v_beta_count INTEGER;
  v_should_grant_beta BOOLEAN;
  v_has_invite_code BOOLEAN;
BEGIN
  -- Check if this user has a waitlist application
  SELECT * INTO v_waitlist_app
  FROM waitlist_applications
  WHERE lower(email) = lower(NEW.email);
  
  -- Count current beta users
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true
  AND id != NEW.id;
  
  -- Check if they used an invite code (from waitlist_applications)
  v_has_invite_code := (v_waitlist_app.invite_code IS NOT NULL);
  
  -- Determine if they should get beta access
  v_should_grant_beta := false;
  
  IF v_has_invite_code THEN
    -- They have an invite code - automatic approval
    v_should_grant_beta := true;
  ELSIF v_waitlist_app IS NOT NULL THEN
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
      beta_access = true,
      beta_approved_at = NOW(),
      invite_quota = CASE 
        WHEN v_has_invite_code THEN 2  -- Users who join via invite get 2 invites
        ELSE 3  -- Direct approvals get 3 invites
      END,
      invite_code_used = v_waitlist_app.invite_code,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Link the invite code to the user if it exists
    IF v_has_invite_code THEN
      UPDATE invite_codes
      SET used_by = NEW.id
      WHERE code = v_waitlist_app.invite_code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS apply_waitlist_on_profile_create ON profiles;
CREATE TRIGGER apply_waitlist_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION apply_waitlist_status_on_signup();

-- Step 6: RLS for invite_codes table
-- ====================================================================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "users_view_own_invite_codes" ON invite_codes;
DROP POLICY IF EXISTS "service_role_all_invite_codes" ON invite_codes;

-- Users can see their own invite codes
CREATE POLICY "users_view_own_codes" 
ON invite_codes FOR SELECT 
USING (created_by = auth.uid());

-- Service role can manage all
CREATE POLICY "service_manages_all_codes" 
ON invite_codes FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Step 7: Grant permissions
-- ====================================================================
GRANT EXECUTE ON FUNCTION generate_invite_codes TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_invite_code TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_my_invite_codes TO authenticated;

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ INVITE SYSTEM FIXED WITH ACTUAL SCHEMA!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. Functions use actual column names';
  RAISE NOTICE '2. invite_codes table properly configured';
  RAISE NOTICE '3. Works with existing referral_code system';
  RAISE NOTICE '4. Beta users get invites to share';
  RAISE NOTICE '';
END $$;