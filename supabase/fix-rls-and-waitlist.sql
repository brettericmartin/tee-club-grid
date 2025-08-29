-- ====================================================================
-- COMPREHENSIVE RLS & WAITLIST FIX
-- ====================================================================
-- This script fixes the critical RLS issues preventing waitlist approvals
-- and ensures proper security policies for all tables
-- ====================================================================

-- ====================================================================
-- PART 1: ENABLE RLS ON ALL CRITICAL TABLES
-- ====================================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PART 2: DROP EXISTING POLICIES (CLEAN SLATE)
-- ====================================================================

-- Drop all existing policies for profiles table to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- ====================================================================
-- PART 3: CREATE PROPER POLICIES FOR PROFILES TABLE
-- ====================================================================

-- CRITICAL: Allow service role to bypass RLS completely
CREATE POLICY "Service role bypasses RLS" ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access to profiles
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  );

-- ====================================================================
-- PART 4: CREATE POLICIES FOR USER_BAGS
-- ====================================================================

DROP POLICY IF EXISTS "Public can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON user_bags;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON user_bags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all bags
CREATE POLICY "Public can view bags" ON user_bags
  FOR SELECT
  TO public
  USING (true);

-- Users can manage their own bags
CREATE POLICY "Users can manage own bags" ON user_bags
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ====================================================================
-- PART 5: CREATE POLICIES FOR BAG_EQUIPMENT
-- ====================================================================

DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON bag_equipment;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON bag_equipment
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all bag equipment
CREATE POLICY "Public can view bag equipment" ON bag_equipment
  FOR SELECT
  TO public
  USING (true);

-- Users can manage equipment in their own bags
CREATE POLICY "Users can manage own bag equipment" ON bag_equipment
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- ====================================================================
-- PART 6: CREATE POLICIES FOR EQUIPMENT_PHOTOS
-- ====================================================================

DROP POLICY IF EXISTS "Public can view equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can upload photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can manage own photos" ON equipment_photos;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON equipment_photos;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON equipment_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all equipment photos
CREATE POLICY "Public can view equipment photos" ON equipment_photos
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can upload photos
CREATE POLICY "Users can upload photos" ON equipment_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can manage their own photos
CREATE POLICY "Users can manage own photos" ON equipment_photos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ====================================================================
-- PART 7: CREATE POLICIES FOR FEED_POSTS
-- ====================================================================

DROP POLICY IF EXISTS "Public can view feed posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can create posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can manage own posts" ON feed_posts;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON feed_posts;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON feed_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all feed posts
CREATE POLICY "Public can view feed posts" ON feed_posts
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create posts
CREATE POLICY "Users can create posts" ON feed_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can manage their own posts
CREATE POLICY "Users can manage own posts" ON feed_posts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts" ON feed_posts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ====================================================================
-- PART 8: CREATE POLICIES FOR FEED_LIKES
-- ====================================================================

DROP POLICY IF EXISTS "Public can view likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON feed_likes;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON feed_likes;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON feed_likes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all likes
CREATE POLICY "Public can view likes" ON feed_likes
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can like posts
CREATE POLICY "Users can like posts" ON feed_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can unlike posts they liked
CREATE POLICY "Users can unlike posts" ON feed_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ====================================================================
-- PART 9: CREATE POLICIES FOR USER_FOLLOWS
-- ====================================================================

DROP POLICY IF EXISTS "Public can view follows" ON user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON user_follows;
DROP POLICY IF EXISTS "Service role bypasses RLS" ON user_follows;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON user_follows
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can view all follows
CREATE POLICY "Public can view follows" ON user_follows
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow others" ON user_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "Users can unfollow" ON user_follows
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- ====================================================================
-- PART 10: CREATE POLICIES FOR WAITLIST_APPLICATIONS
-- ====================================================================

DROP POLICY IF EXISTS "Service role bypasses RLS" ON waitlist_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can view applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON waitlist_applications;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON waitlist_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can submit applications
CREATE POLICY "Public can submit applications" ON waitlist_applications
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view applications" ON waitlist_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update applications
CREATE POLICY "Admins can manage applications" ON waitlist_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================================
-- PART 11: CREATE POLICIES FOR ADMINS TABLE
-- ====================================================================

DROP POLICY IF EXISTS "Service role bypasses RLS" ON admins;
DROP POLICY IF EXISTS "Admins can view admin list" ON admins;

-- Service role bypass
CREATE POLICY "Service role bypasses RLS" ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Only admins can view the admin list
CREATE POLICY "Admins can view admin list" ON admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================================
-- PART 12: FIX THE WAITLIST APPROVAL FUNCTION
-- ====================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS approve_user_by_email_if_capacity(text);

-- Create improved approval function that works with RLS
CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(user_email text)
RETURNS jsonb AS $$
DECLARE
  v_application record;
  v_current_count integer;
  v_max_capacity integer := 100;
  v_auth_user record;
  v_profile_exists boolean;
  v_result jsonb;
BEGIN
  -- Check if we're at capacity
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
  LIMIT 1;
  
  IF v_application IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No pending application found for this email',
      'email', user_email
    );
  END IF;
  
  -- Check if user exists in auth.users
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF v_auth_user IS NULL THEN
    -- User hasn't signed up yet, just mark application as approved
    UPDATE waitlist_applications
    SET 
      status = 'approved',
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = v_application.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Application approved - user will get beta access when they sign up',
      'application_id', v_application.id,
      'email', user_email
    );
  END IF;
  
  -- Check if profile already exists
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = v_auth_user.id
  ) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE profiles
    SET 
      beta_access = true,
      updated_at = NOW()
    WHERE id = v_auth_user.id;
  ELSE
    -- Create new profile
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
      COALESCE(v_auth_user.raw_user_meta_data->>'username', split_part(v_auth_user.email, '@', 1)),
      COALESCE(v_auth_user.raw_user_meta_data->>'full_name', v_application.name, split_part(v_auth_user.email, '@', 1)),
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
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User approved and profile created/updated',
    'user_id', v_auth_user.id,
    'email', user_email,
    'current_beta_count', v_current_count + 1
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error during approval: ' || SQLERRM,
    'email', user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO service_role;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO authenticated;

-- ====================================================================
-- PART 13: CREATE HELPER FUNCTION TO CHECK RLS STATUS
-- ====================================================================

CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled,
    COUNT(p.polname)::integer AS policy_count
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION check_rls_status() TO authenticated;

-- ====================================================================
-- PART 14: ADD MISSING COLUMNS TO PROFILES TABLE IF NEEDED
-- ====================================================================

-- Add columns that might be missing (safe to run multiple times)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_quota INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ====================================================================
-- PART 15: CREATE INDEX FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_status ON waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_email ON waitlist_applications(email);

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Check RLS status for all tables
SELECT * FROM check_rls_status();

-- Verify profiles table has proper columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('beta_access', 'invite_quota', 'invites_sent', 'referral_code', 'email', 'is_admin', 'display_name')
ORDER BY column_name;

-- Count policies on profiles table
SELECT COUNT(*) AS profile_policy_count
FROM pg_policy
WHERE polrelid = 'profiles'::regclass;

-- Show current beta user count
SELECT 
  COUNT(*) FILTER (WHERE beta_access = true) AS beta_users,
  COUNT(*) FILTER (WHERE is_admin = true) AS admin_users,
  COUNT(*) AS total_users
FROM profiles;

-- ====================================================================
-- END OF FIX SCRIPT
-- ====================================================================
-- This script should resolve all RLS issues preventing waitlist approvals
-- Run this in the Supabase SQL Editor with admin/service role access
-- ====================================================================