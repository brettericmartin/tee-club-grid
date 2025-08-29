-- ====================================================================
-- SIMPLIFY BETA SYSTEM AND RLS POLICIES
-- ====================================================================
-- This migration:
-- 1. Removes overcomplicated admin RLS policies
-- 2. Sets up simple, clear RLS for user data protection
-- 3. Enables automatic profile creation on waitlist submission
-- 4. Implements the first 150 users auto-approval system
-- ====================================================================

-- Step 1: Ensure profiles table has all necessary columns
-- ====================================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_quota INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS city_region TEXT,
ADD COLUMN IF NOT EXISTS waitlist_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access);

-- Step 2: Clean up ALL overcomplicated admin RLS policies
-- ====================================================================
DO $$ 
DECLARE
  policy_rec RECORD;
BEGIN
  -- Drop all admin-related policies (we'll handle admin checks in application layer)
  FOR policy_rec IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND (
      policyname ILIKE '%admin%' 
      OR policyname ILIKE '%service_role%'
      OR qual ILIKE '%is_admin%'
      OR qual ILIKE '%admins%table%'
      OR with_check ILIKE '%is_admin%'
      OR with_check ILIKE '%admins%table%'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_rec.policyname, 
      policy_rec.schemaname, 
      policy_rec.tablename
    );
    RAISE NOTICE 'Dropped policy: % on %.%', 
      policy_rec.policyname, 
      policy_rec.schemaname, 
      policy_rec.tablename;
  END LOOP;
END $$;

-- Step 3: Create SIMPLE, CLEAR RLS policies for core tables
-- ====================================================================

-- PROFILES table - Simple and clear
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Anyone can view profiles" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Special policy for waitlist profile creation (no auth required)
CREATE POLICY "System can create profiles for waitlist" 
ON profiles FOR INSERT 
WITH CHECK (
  auth.uid() IS NULL 
  OR auth.uid() = id
);

-- USER_BAGS table - Users manage own bags
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public bags are viewable by everyone" ON user_bags;
DROP POLICY IF EXISTS "Users can create own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can update own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can delete own bags" ON user_bags;

CREATE POLICY "View public bags" 
ON user_bags FOR SELECT 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users manage own bags" 
ON user_bags FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- BAG_EQUIPMENT table - Follow bag permissions
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bag equipment viewable if bag is viewable" ON bag_equipment;
DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;

CREATE POLICY "View bag equipment" 
ON bag_equipment FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_equipment.bag_id 
    AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
  )
);

CREATE POLICY "Users manage own bag equipment" 
ON bag_equipment FOR ALL 
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

-- WAITLIST_APPLICATIONS table - Simple submission
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Drop all existing waitlist policies
DO $$ 
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'waitlist_applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', policy_rec.policyname);
  END LOOP;
END $$;

-- Simple waitlist policies
CREATE POLICY "Anyone can submit waitlist" 
ON waitlist_applications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users view own applications" 
ON waitlist_applications FOR SELECT 
USING (
  auth.jwt() ->> 'email' = email
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Admin operations handled by service role in API
CREATE POLICY "Service role manages waitlist" 
ON waitlist_applications FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Step 4: Create function to handle profile creation on waitlist submission
-- ====================================================================
CREATE OR REPLACE FUNCTION create_profile_for_waitlist(
  p_email TEXT,
  p_display_name TEXT,
  p_city_region TEXT,
  p_referral_code TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_beta_count INTEGER;
  v_should_approve BOOLEAN;
BEGIN
  -- Generate a new UUID for the profile
  v_profile_id := gen_random_uuid();
  
  -- Count current beta users
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- First 150 users get automatic beta access
  v_should_approve := (v_beta_count < 150);
  
  -- Create the profile
  INSERT INTO profiles (
    id,
    email,
    username,
    display_name,
    city_region,
    beta_access,
    waitlist_submitted_at,
    beta_approved_at,
    referral_code,
    invite_quota,
    created_at,
    updated_at
  ) VALUES (
    v_profile_id,
    lower(p_email),
    lower(split_part(p_email, '@', 1) || '_' || substr(v_profile_id::text, 1, 8)),
    p_display_name,
    p_city_region,
    v_should_approve,
    NOW(),
    CASE WHEN v_should_approve THEN NOW() ELSE NULL END,
    CASE WHEN p_referral_code IS NOT NULL THEN upper(p_referral_code) 
         WHEN v_should_approve THEN upper(substr(md5(random()::text), 1, 8))
         ELSE NULL END,
    CASE WHEN v_should_approve THEN 3 ELSE 0 END,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    city_region = COALESCE(profiles.city_region, EXCLUDED.city_region),
    waitlist_submitted_at = COALESCE(profiles.waitlist_submitted_at, EXCLUDED.waitlist_submitted_at)
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_profile_for_waitlist TO anon, authenticated, service_role;

-- Step 5: Update waitlist submission to create profiles
-- ====================================================================
CREATE OR REPLACE FUNCTION submit_waitlist_with_profile(
  p_email TEXT,
  p_display_name TEXT,
  p_city_region TEXT,
  p_answers JSONB,
  p_score INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_status TEXT;
  v_beta_count INTEGER;
  v_result JSONB;
BEGIN
  -- Create or update profile
  v_profile_id := create_profile_for_waitlist(p_email, p_display_name, p_city_region);
  
  -- Check if they got beta access
  SELECT beta_access INTO v_status
  FROM profiles
  WHERE id = v_profile_id;
  
  -- Create or update waitlist application
  INSERT INTO waitlist_applications (
    email,
    display_name,
    city_region,
    answers,
    score,
    status,
    approved_at,
    created_at,
    updated_at
  ) VALUES (
    lower(p_email),
    p_display_name,
    p_city_region,
    p_answers,
    p_score,
    CASE WHEN v_status THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_status THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    display_name = EXCLUDED.display_name,
    city_region = EXCLUDED.city_region,
    answers = EXCLUDED.answers,
    score = GREATEST(waitlist_applications.score, EXCLUDED.score),
    updated_at = NOW();
  
  -- Get beta count for response
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Build response
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'beta_access', v_status,
    'beta_users_count', v_beta_count,
    'spots_remaining', GREATEST(0, 150 - v_beta_count),
    'message', CASE 
      WHEN v_status THEN 'Welcome to Teed.club Beta! You have immediate access.'
      ELSE 'You''re on the waitlist! We''ll notify you when a spot opens.'
    END
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_waitlist_with_profile TO anon, authenticated, service_role;

-- Step 6: Function to check user's beta status
-- ====================================================================
CREATE OR REPLACE FUNCTION get_user_beta_status(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profile RECORD;
  v_beta_count INTEGER;
BEGIN
  -- Get profile info
  SELECT 
    id,
    beta_access,
    is_admin,
    invite_quota,
    referral_code,
    beta_approved_at
  INTO v_profile
  FROM profiles
  WHERE email = lower(p_email);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'message', 'No application found'
    );
  END IF;
  
  -- Get current beta count
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  v_result := jsonb_build_object(
    'status', CASE 
      WHEN v_profile.beta_access THEN 'approved'
      ELSE 'pending'
    END,
    'profile_id', v_profile.id,
    'is_admin', v_profile.is_admin,
    'invite_quota', v_profile.invite_quota,
    'referral_code', v_profile.referral_code,
    'beta_users_count', v_beta_count,
    'spots_remaining', GREATEST(0, 150 - v_beta_count),
    'approved_at', v_profile.beta_approved_at
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission  
GRANT EXECUTE ON FUNCTION get_user_beta_status TO anon, authenticated, service_role;

-- Step 7: Handle admin-related objects
-- ====================================================================
-- The 'admins' object might be a view or in auth schema, handle gracefully
DO $$
BEGIN
  -- Try to disable RLS if it's a table
  BEGIN
    ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on admins table';
  EXCEPTION
    WHEN wrong_object_type THEN
      RAISE NOTICE 'admins is not a table (likely a view), skipping RLS disable';
    WHEN undefined_table THEN
      RAISE NOTICE 'admins table does not exist, skipping';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter admins: %', SQLERRM;
  END;
END $$;

-- Step 8: Ensure equipment and other tables have simple RLS
-- ====================================================================
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
CREATE POLICY "Anyone can view equipment" ON equipment FOR SELECT USING (true);

ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
-- Keep existing equipment_photos policies as they're already simple

-- Step 9: Add/Update helper function for admin checks (application layer will use this)
-- ====================================================================
-- The function already exists with 'user_id' parameter, update it to ensure it's correct
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, service_role;

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ BETA SYSTEM SIMPLIFIED!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. RLS policies simplified - no more complex admin checks';
  RAISE NOTICE '2. Profiles created automatically on waitlist submission';
  RAISE NOTICE '3. First 150 users get automatic beta access';
  RAISE NOTICE '4. Admin checks moved to application layer';
  RAISE NOTICE '5. Clean, maintainable policy structure';
  RAISE NOTICE '';
END $$;