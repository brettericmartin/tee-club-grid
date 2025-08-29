-- ====================================================================
-- SIMPLIFY SYSTEM: REMOVE REFERRAL CODES, USE INVITE CODES ONLY
-- ====================================================================
-- This migration:
-- 1. Removes complex referral code tracking
-- 2. Implements simple invite code system
-- 3. Each beta user gets invite codes to share
-- ====================================================================

-- Step 1: Clean up referral-related columns and tables
-- ====================================================================
-- Remove referral_code from profiles (keep invite_quota)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS referral_code CASCADE;

-- Remove referral tracking from waitlist_applications
ALTER TABLE waitlist_applications
DROP COLUMN IF EXISTS referral_code CASCADE,
DROP COLUMN IF EXISTS referred_by CASCADE,
DROP COLUMN IF EXISTS referred_by_id CASCADE;

-- Drop referral-related tables if they exist
DROP TABLE IF EXISTS referral_chains CASCADE;
DROP TABLE IF EXISTS referral_leaderboard CASCADE;

-- Step 2: Create invite codes table
-- ====================================================================
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  used_by_email TEXT,
  used_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Indexes
  CONSTRAINT invite_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_active ON invite_codes(is_active);

-- Step 3: Function to generate invite codes for beta users
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
    
    -- Insert the code
    INSERT INTO invite_codes (
      code,
      created_by,
      expires_at,
      is_active
    ) VALUES (
      v_code,
      p_user_id,
      NOW() + INTERVAL '30 days',
      true
    );
    
    v_codes := array_append(v_codes, v_code);
  END LOOP;
  
  -- Update user's invite quota
  UPDATE profiles
  SET invite_quota = GREATEST(0, invite_quota - p_count)
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT unnest(v_codes);
END;
$$;

-- Step 4: Function to redeem invite code
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
  -- Validate the invite code
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE upper(code) = upper(p_code)
  AND is_active = true
  AND used_by_email IS NULL
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
  
  -- Mark the code as used
  UPDATE invite_codes
  SET 
    used_by_email = lower(p_email),
    used_at = NOW(),
    is_active = false
  WHERE id = v_invite.id;
  
  -- Create or update waitlist application with guaranteed approval
  INSERT INTO waitlist_applications (
    email,
    status,
    approved_at,
    invite_code,
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

-- Step 5: Function to get user's invite codes
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
    ic.used_by_email,
    ic.used_at,
    ic.expires_at,
    ic.is_active,
    CASE
      WHEN ic.used_by_email IS NOT NULL THEN 'used'
      WHEN ic.expires_at < NOW() THEN 'expired'
      WHEN ic.is_active = false THEN 'deactivated'
      ELSE 'active'
    END as status
  FROM invite_codes ic
  WHERE ic.created_by = p_user_id
  ORDER BY ic.created_at DESC;
END;
$$;

-- Step 6: Update trigger for profile creation to check invite codes
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
  v_invite_code TEXT;
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
  
  -- Check if they used an invite code
  SELECT code INTO v_invite_code
  FROM invite_codes
  WHERE lower(used_by_email) = lower(NEW.email)
  AND is_active = false
  LIMIT 1;
  
  -- Determine if they should get beta access
  v_should_grant_beta := false;
  
  IF v_invite_code IS NOT NULL THEN
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
        WHEN v_invite_code IS NOT NULL THEN 2  -- Users who join via invite get 2 invites
        ELSE 3  -- Direct approvals get 3 invites
      END,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Update invite code with profile ID if used
    IF v_invite_code IS NOT NULL THEN
      UPDATE invite_codes
      SET used_by_profile_id = NEW.id
      WHERE code = v_invite_code;
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

-- Step 7: Simple RLS for invite_codes table
-- ====================================================================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can see their own invite codes
CREATE POLICY "users_view_own_invite_codes" 
ON invite_codes FOR SELECT 
USING (created_by = auth.uid());

-- Service role can manage all
CREATE POLICY "service_role_all_invite_codes" 
ON invite_codes FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Step 8: Grant permissions
-- ====================================================================
GRANT EXECUTE ON FUNCTION generate_invite_codes TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_invite_code TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_my_invite_codes TO authenticated;

-- Step 9: Generate initial invite codes for existing beta users
-- ====================================================================
DO $$
DECLARE
  v_user RECORD;
BEGIN
  -- For each beta user who doesn't have invite codes yet
  FOR v_user IN 
    SELECT id, invite_quota 
    FROM profiles 
    WHERE beta_access = true 
    AND invite_quota > 0
  LOOP
    -- Check if they already have codes
    IF NOT EXISTS (
      SELECT 1 FROM invite_codes 
      WHERE created_by = v_user.id
    ) THEN
      -- Generate their invite codes
      PERFORM generate_invite_codes(v_user.id, LEAST(v_user.invite_quota, 3));
    END IF;
  END LOOP;
END $$;

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ INVITE CODE SYSTEM IMPLEMENTED!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. Removed complex referral tracking';
  RAISE NOTICE '2. Simple invite code system created';
  RAISE NOTICE '3. Beta users get 3 invites to share';
  RAISE NOTICE '4. Invited users get 2 invites when they join';
  RAISE NOTICE '5. Invite codes expire after 30 days';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  • generate_invite_codes(user_id, count)';
  RAISE NOTICE '  • redeem_invite_code(code, email)';
  RAISE NOTICE '  • get_my_invite_codes(user_id)';
  RAISE NOTICE '';
END $$;