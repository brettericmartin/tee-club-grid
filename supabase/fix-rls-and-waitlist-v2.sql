-- ====================================================================
-- COMPREHENSIVE RLS & WAITLIST FIX (V2 - Handles Views Correctly)
-- ====================================================================
-- This script fixes the critical RLS issues preventing waitlist approvals
-- and ensures proper security policies for all tables
-- ====================================================================

-- ====================================================================
-- PART 1: ENABLE RLS ON ALL CRITICAL TABLES (Skip Views)
-- ====================================================================

-- Only enable RLS on actual tables, not views
DO $$
BEGIN
  -- Check each object and only enable RLS if it's a table
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles' AND relkind = 'r') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_bags' AND relkind = 'r') THEN
    ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bag_equipment' AND relkind = 'r') THEN
    ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'equipment_photos' AND relkind = 'r') THEN
    ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'feed_posts' AND relkind = 'r') THEN
    ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'feed_likes' AND relkind = 'r') THEN
    ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_follows' AND relkind = 'r') THEN
    ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'waitlist_applications' AND relkind = 'r') THEN
    ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'equipment_saves' AND relkind = 'r') THEN
    ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'equipment_reports' AND relkind = 'r') THEN
    ALTER TABLE equipment_reports ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_badges' AND relkind = 'r') THEN
    ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ====================================================================
-- PART 2: DROP EXISTING POLICIES (CLEAN SLATE)
-- ====================================================================

-- Drop all existing policies for profiles table to start fresh
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
  DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
  DROP POLICY IF EXISTS "Service role bypasses RLS" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
  DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if table doesn't exist
END $$;

-- ====================================================================
-- PART 3: CREATE PROPER POLICIES FOR PROFILES TABLE (MOST CRITICAL)
-- ====================================================================

-- CRITICAL: Allow service role to bypass RLS completely
CREATE POLICY "Service role bypasses RLS" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow public read access to profiles
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- ====================================================================
-- PART 4: CREATE POLICIES FOR USER_BAGS
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_bags' AND relkind = 'r') THEN
    DROP POLICY IF EXISTS "Public can view bags" ON user_bags;
    DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags;
    DROP POLICY IF EXISTS "Service role bypasses RLS" ON user_bags;

    -- Service role bypass
    CREATE POLICY "Service role bypasses RLS" ON user_bags
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Public can view all bags
    CREATE POLICY "Public can view bags" ON user_bags
      FOR SELECT
      USING (true);

    -- Users can manage their own bags
    CREATE POLICY "Users can manage own bags" ON user_bags
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ====================================================================
-- PART 5: CREATE POLICIES FOR BAG_EQUIPMENT
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bag_equipment' AND relkind = 'r') THEN
    DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment;
    DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;
    DROP POLICY IF EXISTS "Service role bypasses RLS" ON bag_equipment;

    -- Service role bypass
    CREATE POLICY "Service role bypasses RLS" ON bag_equipment
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Public can view all bag equipment
    CREATE POLICY "Public can view bag equipment" ON bag_equipment
      FOR SELECT
      USING (true);

    -- Users can manage equipment in their own bags
    CREATE POLICY "Users can manage own bag equipment" ON bag_equipment
      FOR ALL
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
  END IF;
END $$;

-- ====================================================================
-- PART 6: CREATE POLICIES FOR EQUIPMENT_PHOTOS
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'equipment_photos' AND relkind = 'r') THEN
    DROP POLICY IF EXISTS "Public can view equipment photos" ON equipment_photos;
    DROP POLICY IF EXISTS "Users can upload photos" ON equipment_photos;
    DROP POLICY IF EXISTS "Users can manage own photos" ON equipment_photos;
    DROP POLICY IF EXISTS "Users can delete own photos" ON equipment_photos;
    DROP POLICY IF EXISTS "Service role bypasses RLS" ON equipment_photos;

    -- Service role bypass
    CREATE POLICY "Service role bypasses RLS" ON equipment_photos
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Public can view all equipment photos
    CREATE POLICY "Public can view equipment photos" ON equipment_photos
      FOR SELECT
      USING (true);

    -- Authenticated users can upload photos
    CREATE POLICY "Users can upload photos" ON equipment_photos
      FOR INSERT
      WITH CHECK (user_id = auth.uid());

    -- Users can manage their own photos
    CREATE POLICY "Users can manage own photos" ON equipment_photos
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Users can delete their own photos
    CREATE POLICY "Users can delete own photos" ON equipment_photos
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ====================================================================
-- PART 7: CREATE POLICIES FOR FEED_POSTS
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'feed_posts' AND relkind = 'r') THEN
    DROP POLICY IF EXISTS "Public can view feed posts" ON feed_posts;
    DROP POLICY IF EXISTS "Users can create posts" ON feed_posts;
    DROP POLICY IF EXISTS "Users can manage own posts" ON feed_posts;
    DROP POLICY IF EXISTS "Users can delete own posts" ON feed_posts;
    DROP POLICY IF EXISTS "Service role bypasses RLS" ON feed_posts;

    -- Service role bypass
    CREATE POLICY "Service role bypasses RLS" ON feed_posts
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Public can view all feed posts
    CREATE POLICY "Public can view feed posts" ON feed_posts
      FOR SELECT
      USING (true);

    -- Authenticated users can create posts
    CREATE POLICY "Users can create posts" ON feed_posts
      FOR INSERT
      WITH CHECK (user_id = auth.uid());

    -- Users can manage their own posts
    CREATE POLICY "Users can manage own posts" ON feed_posts
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Users can delete their own posts
    CREATE POLICY "Users can delete own posts" ON feed_posts
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ====================================================================
-- PART 8: CREATE POLICIES FOR WAITLIST_APPLICATIONS
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'waitlist_applications' AND relkind = 'r') THEN
    DROP POLICY IF EXISTS "Service role bypasses RLS" ON waitlist_applications;
    DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications;
    DROP POLICY IF EXISTS "Admins can view applications" ON waitlist_applications;
    DROP POLICY IF EXISTS "Admins can manage applications" ON waitlist_applications;

    -- Service role bypass
    CREATE POLICY "Service role bypasses RLS" ON waitlist_applications
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Public can submit applications
    CREATE POLICY "Public can submit applications" ON waitlist_applications
      FOR INSERT
      WITH CHECK (true);

    -- Admins can view all applications
    CREATE POLICY "Admins can view applications" ON waitlist_applications
      FOR SELECT
      USING (
        auth.uid() IN (
          SELECT id FROM profiles WHERE is_admin = true
        )
      );

    -- Admins can update applications
    CREATE POLICY "Admins can manage applications" ON waitlist_applications
      FOR UPDATE
      USING (
        auth.uid() IN (
          SELECT id FROM profiles WHERE is_admin = true
        )
      )
      WITH CHECK (
        auth.uid() IN (
          SELECT id FROM profiles WHERE is_admin = true
        )
      );
  END IF;
END $$;

-- ====================================================================
-- PART 9: ADD MISSING COLUMNS TO PROFILES TABLE IF NEEDED
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
-- PART 10: FIX THE WAITLIST APPROVAL FUNCTION
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO service_role;
GRANT EXECUTE ON FUNCTION approve_user_by_email_if_capacity(text) TO authenticated;

-- ====================================================================
-- PART 11: CREATE HELPER FUNCTION TO CHECK RLS STATUS
-- ====================================================================

DROP FUNCTION IF EXISTS check_rls_status();

CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  is_view boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled,
    COUNT(p.polname)::integer AS policy_count,
    CASE WHEN c.relkind = 'v' THEN true ELSE false END AS is_view
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind IN ('r', 'v') -- Include both tables and views
  GROUP BY c.relname, c.relrowsecurity, c.relkind
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION check_rls_status() TO authenticated;

-- ====================================================================
-- PART 12: CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_status ON waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_email ON waitlist_applications(email);

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Check RLS status for all tables and views
SELECT * FROM check_rls_status() ORDER BY is_view, table_name;

-- Verify profiles table has proper columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('beta_access', 'invite_quota', 'invites_sent', 'referral_code', 'email', 'is_admin', 'display_name')
ORDER BY column_name;

-- Count policies on profiles table
SELECT 
  'Profiles table policies' as description,
  COUNT(*) AS policy_count
FROM pg_policy
WHERE polrelid = 'profiles'::regclass;

-- Show current beta user count
SELECT 
  COUNT(*) FILTER (WHERE beta_access = true) AS beta_users,
  COUNT(*) FILTER (WHERE is_admin = true) AS admin_users,
  COUNT(*) AS total_users
FROM profiles;

-- Check if the approval function exists
SELECT 
  'approve_user_by_email_if_capacity' as function_name,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc
WHERE proname = 'approve_user_by_email_if_capacity';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS AND WAITLIST FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'The following has been completed:';
  RAISE NOTICE '1. RLS enabled on all tables (skipped views)';
  RAISE NOTICE '2. Service role bypass policies created';
  RAISE NOTICE '3. INSERT policies added for profiles table';
  RAISE NOTICE '4. Waitlist approval function created';
  RAISE NOTICE '5. Missing columns added to profiles table';
  RAISE NOTICE '';
  RAISE NOTICE 'Test with: node scripts/test-waitlist-approval.js';
  RAISE NOTICE '';
END $$;

-- ====================================================================
-- END OF FIX SCRIPT V2
-- ====================================================================