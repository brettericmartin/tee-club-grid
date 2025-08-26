-- ====================================================================
-- COMPREHENSIVE RLS & WAITLIST FIX (FINAL VERSION)
-- ====================================================================
-- This script fixes the critical RLS issues preventing waitlist approvals
-- Handles the 'admins' view correctly
-- ====================================================================

-- ====================================================================
-- PART 1: ENABLE RLS ON ACTUAL TABLES ONLY
-- ====================================================================

-- Enable RLS on tables (skip admins as it appears to be a view or has special behavior)
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;

-- Note: Skipping 'admins' as it appears to be a view or special object

-- ====================================================================
-- PART 2: CRITICAL FIX - PROFILES TABLE POLICIES
-- ====================================================================

-- Drop all existing policies for profiles table to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON profiles CASCADE;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles CASCADE;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles CASCADE;

-- CRITICAL: Create comprehensive policies for profiles
-- Policy 1: Public read access
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT
  USING (true);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can do everything
CREATE POLICY "Admins bypass RLS" ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ====================================================================
-- PART 3: ADD MISSING COLUMNS TO PROFILES TABLE
-- ====================================================================

-- Add columns that the approval function needs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_quota INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ====================================================================
-- PART 4: CREATE THE APPROVAL FUNCTION WITH SECURITY DEFINER
-- ====================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text);

-- Create approval function that bypasses RLS
CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(user_email text)
RETURNS jsonb
SECURITY DEFINER -- This makes the function run with the privileges of the owner (bypasses RLS)
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
    UPDATE waitlist_applications
    SET 
      status = 'approved',
      approved_at = NOW(),
      updated_at = NOW()
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
      email = COALESCE(email, v_auth_user.email),
      display_name = COALESCE(display_name, v_application.name),
      invite_quota = GREATEST(invite_quota, 3),
      updated_at = NOW()
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
      created_at,
      updated_at
    ) VALUES (
      v_auth_user.id,
      v_auth_user.email,
      COALESCE(
        v_auth_user.raw_user_meta_data->>'username',
        split_part(v_auth_user.email, '@', 1)
      ),
      COALESCE(
        v_application.name,
        v_auth_user.raw_user_meta_data->>'full_name',
        split_part(v_auth_user.email, '@', 1)
      ),
      true,
      3,
      0,
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
      NOW(),
      NOW()
    );
  END IF;
  
  -- Update the waitlist application
  UPDATE waitlist_applications
  SET 
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
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
    'detail', SQLSTATE
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO service_role;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO anon;

-- ====================================================================
-- PART 5: CREATE BASIC POLICIES FOR OTHER CRITICAL TABLES
-- ====================================================================

-- User bags policies
DROP POLICY IF EXISTS "Public can view bags" ON user_bags CASCADE;
DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags CASCADE;

CREATE POLICY "Anyone can view bags" ON user_bags
  FOR SELECT USING (true);

CREATE POLICY "Users manage own bags" ON user_bags
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bag equipment policies
DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment CASCADE;
DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment CASCADE;

CREATE POLICY "Anyone can view equipment" ON bag_equipment
  FOR SELECT USING (true);

CREATE POLICY "Users manage own equipment" ON bag_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Waitlist applications policies
DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications CASCADE;
DROP POLICY IF EXISTS "Admins can view applications" ON waitlist_applications CASCADE;
DROP POLICY IF EXISTS "Admins can manage applications" ON waitlist_applications CASCADE;

CREATE POLICY "Anyone can apply" ON waitlist_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view applications" ON waitlist_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins manage applications" ON waitlist_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================================
-- PART 6: CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_applications(email);

-- ====================================================================
-- PART 7: VERIFICATION
-- ====================================================================

-- Show the results
DO $$
DECLARE
  v_profile_policies integer;
  v_beta_count integer;
  v_function_exists boolean;
BEGIN
  -- Count policies on profiles
  SELECT COUNT(*) INTO v_profile_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  -- Count beta users
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles WHERE beta_access = true;
  
  -- Check if function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'approve_user_by_email_if_capacity'
  ) INTO v_function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Profiles policies: %', v_profile_policies;
  RAISE NOTICE 'Beta users: %', v_beta_count;
  RAISE NOTICE 'Approval function: %', CASE WHEN v_function_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'The waitlist approval should now work!';
  RAISE NOTICE '';
END $$;

-- ====================================================================
-- END OF FINAL FIX
-- ====================================================================