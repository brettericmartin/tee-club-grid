-- ====================================================================
-- FIX EXISTING POLICIES - HANDLE DUPLICATES
-- ====================================================================
-- This migration safely handles existing policies and functions
-- ====================================================================

-- Step 1: Drop existing policies that we're going to recreate
-- ====================================================================
DO $$ 
BEGIN
  -- Drop existing profiles policies
  DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
  DROP POLICY IF EXISTS "System can create profiles for waitlist" ON profiles;
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
  DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
  
  -- Drop existing user_bags policies
  DROP POLICY IF EXISTS "View public bags" ON user_bags;
  DROP POLICY IF EXISTS "Users manage own bags" ON user_bags;
  DROP POLICY IF EXISTS "Public bags are viewable by everyone" ON user_bags;
  DROP POLICY IF EXISTS "Users can create own bags" ON user_bags;
  DROP POLICY IF EXISTS "Users can update own bags" ON user_bags;
  DROP POLICY IF EXISTS "Users can delete own bags" ON user_bags;
  
  -- Drop existing bag_equipment policies
  DROP POLICY IF EXISTS "View bag equipment" ON bag_equipment;
  DROP POLICY IF EXISTS "Users manage own bag equipment" ON bag_equipment;
  DROP POLICY IF EXISTS "Bag equipment viewable if bag is viewable" ON bag_equipment;
  DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;
  
  -- Drop existing waitlist_applications policies
  DROP POLICY IF EXISTS "Anyone can submit waitlist" ON waitlist_applications;
  DROP POLICY IF EXISTS "Users view own applications" ON waitlist_applications;
  DROP POLICY IF EXISTS "Service role manages waitlist" ON waitlist_applications;
  DROP POLICY IF EXISTS "Anyone can submit application" ON waitlist_applications;
  DROP POLICY IF EXISTS "Users can view own applications" ON waitlist_applications;
  DROP POLICY IF EXISTS "Only admins can update" ON waitlist_applications;
  DROP POLICY IF EXISTS "Only admins can delete" ON waitlist_applications;
  
  -- Drop existing equipment policies
  DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment;
  DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
  
  RAISE NOTICE 'Dropped existing policies';
END $$;

-- Step 2: Create clean, simple policies
-- ====================================================================

-- PROFILES table
CREATE POLICY "profiles_public_read" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "profiles_users_update_own" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "profiles_users_insert_own" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- USER_BAGS table
CREATE POLICY "bags_public_read" 
ON user_bags FOR SELECT 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "bags_users_manage_own" 
ON user_bags FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- BAG_EQUIPMENT table
CREATE POLICY "bag_equipment_read" 
ON bag_equipment FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_equipment.bag_id 
    AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
  )
);

CREATE POLICY "bag_equipment_users_manage_own" 
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

-- WAITLIST_APPLICATIONS table
CREATE POLICY "waitlist_public_insert" 
ON waitlist_applications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "waitlist_users_view_own" 
ON waitlist_applications FOR SELECT 
USING (
  auth.jwt() ->> 'email' = email
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "waitlist_service_role" 
ON waitlist_applications FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- EQUIPMENT table
CREATE POLICY "equipment_public_read" 
ON equipment FOR SELECT 
USING (true);

-- Step 3: Ensure RLS is enabled on all important tables
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Step 4: Ensure tables have required columns and constraints
-- ====================================================================
-- Profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_quota INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS city_region TEXT,
ADD COLUMN IF NOT EXISTS waitlist_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ;

-- Waitlist applications table - ensure email has unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waitlist_applications_email_unique'
  ) THEN
    ALTER TABLE waitlist_applications 
    ADD CONSTRAINT waitlist_applications_email_unique UNIQUE (email);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON profiles(beta_access);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_applications(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_applications(status);

-- Step 5: Create or replace the key functions
-- ====================================================================

-- Drop old versions if they exist
DROP FUNCTION IF EXISTS submit_waitlist_with_profile(TEXT, TEXT, TEXT, JSONB, INTEGER);
DROP FUNCTION IF EXISTS create_profile_for_waitlist(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_beta_status(TEXT);
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create submit_waitlist_with_profile function
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
  v_beta_access BOOLEAN;
  v_beta_count INTEGER;
  v_result JSONB;
  v_status TEXT;
BEGIN
  -- Count current beta users
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- First 150 users get automatic beta access
  v_beta_access := (v_beta_count < 150);
  v_status := CASE WHEN v_beta_access THEN 'approved' ELSE 'pending' END;
  
  -- Check if profile already exists (user has signed up)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = lower(p_email);
  
  IF v_profile_id IS NOT NULL THEN
    -- Update existing profile with waitlist info
    UPDATE profiles
    SET 
      display_name = COALESCE(display_name, p_display_name),
      city_region = COALESCE(city_region, p_city_region),
      beta_access = v_beta_access,
      waitlist_submitted_at = COALESCE(waitlist_submitted_at, NOW()),
      beta_approved_at = CASE WHEN v_beta_access THEN COALESCE(beta_approved_at, NOW()) ELSE beta_approved_at END,
      invite_quota = CASE WHEN v_beta_access THEN GREATEST(invite_quota, 3) ELSE invite_quota END,
      referral_code = CASE 
        WHEN v_beta_access AND referral_code IS NULL THEN upper(substr(md5(random()::text), 1, 8))
        ELSE referral_code 
      END,
      updated_at = NOW()
    WHERE id = v_profile_id;
  END IF;
  
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
    v_status,
    CASE WHEN v_beta_access THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    display_name = EXCLUDED.display_name,
    city_region = EXCLUDED.city_region,
    answers = EXCLUDED.answers,
    score = GREATEST(waitlist_applications.score, EXCLUDED.score),
    status = EXCLUDED.status,
    approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN COALESCE(waitlist_applications.approved_at, NOW()) ELSE waitlist_applications.approved_at END,
    updated_at = NOW();
  
  -- Build response
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'beta_access', v_beta_access,
    'beta_users_count', v_beta_count,
    'spots_remaining', GREATEST(0, 150 - v_beta_count),
    'message', CASE 
      WHEN v_beta_access THEN 'Welcome to Teed.club Beta! You have immediate access once you sign up.'
      ELSE 'You''re on the waitlist! We''ll notify you when a spot opens.'
    END
  );
  
  RETURN v_result;
END;
$$;

-- Create get_user_beta_status function
CREATE OR REPLACE FUNCTION get_user_beta_status(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profile RECORD;
  v_waitlist RECORD;
  v_beta_count INTEGER;
BEGIN
  -- Check waitlist application
  SELECT * INTO v_waitlist
  FROM waitlist_applications
  WHERE email = lower(p_email);
  
  IF v_waitlist IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'message', 'No application found'
    );
  END IF;
  
  -- Check for profile
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
  
  -- Get current beta count
  SELECT COUNT(*) INTO v_beta_count
  FROM profiles
  WHERE beta_access = true;
  
  -- Build response
  IF v_profile.id IS NOT NULL THEN
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
      'approved_at', v_profile.beta_approved_at,
      'has_account', true
    );
  ELSE
    v_result := jsonb_build_object(
      'status', v_waitlist.status,
      'profile_id', NULL,
      'is_admin', false,
      'invite_quota', 0,
      'referral_code', NULL,
      'beta_users_count', v_beta_count,
      'spots_remaining', GREATEST(0, 150 - v_beta_count),
      'approved_at', v_waitlist.approved_at,
      'has_account', false,
      'message', 'Application received. Please sign up to access your account.'
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Update is_admin function to use existing parameter name
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION submit_waitlist_with_profile TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_beta_status TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- Step 6: Create trigger for profile creation on signup
-- ====================================================================
CREATE OR REPLACE FUNCTION apply_waitlist_status_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waitlist_app RECORD;
  v_beta_count INTEGER;
BEGIN
  -- Check if this user has a waitlist application
  SELECT * INTO v_waitlist_app
  FROM waitlist_applications
  WHERE email = NEW.email;
  
  IF v_waitlist_app IS NOT NULL THEN
    -- Count current beta users
    SELECT COUNT(*) INTO v_beta_count
    FROM profiles
    WHERE beta_access = true
    AND id != NEW.id;
    
    -- Update profile with waitlist info
    UPDATE profiles
    SET 
      display_name = COALESCE(NEW.display_name, v_waitlist_app.display_name),
      city_region = COALESCE(NEW.city_region, v_waitlist_app.city_region),
      beta_access = (v_waitlist_app.status = 'approved' OR v_beta_count < 150),
      waitlist_submitted_at = v_waitlist_app.created_at,
      beta_approved_at = CASE 
        WHEN v_waitlist_app.status = 'approved' THEN v_waitlist_app.approved_at
        WHEN v_beta_count < 150 THEN NOW()
        ELSE NULL
      END,
      invite_quota = CASE 
        WHEN v_waitlist_app.status = 'approved' OR v_beta_count < 150 THEN 3 
        ELSE 0 
      END,
      referral_code = CASE 
        WHEN (v_waitlist_app.status = 'approved' OR v_beta_count < 150) AND NEW.referral_code IS NULL 
        THEN upper(substr(md5(random()::text), 1, 8))
        ELSE NEW.referral_code
      END
    WHERE id = NEW.id;
    
    -- Update waitlist application status if they got beta access
    IF v_beta_count < 150 AND v_waitlist_app.status != 'approved' THEN
      UPDATE waitlist_applications
      SET 
        status = 'approved',
        approved_at = NOW()
      WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS apply_waitlist_on_profile_create ON profiles;
CREATE TRIGGER apply_waitlist_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION apply_waitlist_status_on_signup();

-- Done!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ POLICIES AND FUNCTIONS FIXED!';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. Removed duplicate policies';
  RAISE NOTICE '2. Created clean, simple RLS policies';
  RAISE NOTICE '3. All functions properly created';
  RAISE NOTICE '4. Beta system ready for use';
  RAISE NOTICE '';
END $$;