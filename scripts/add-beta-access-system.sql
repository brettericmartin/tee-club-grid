-- Beta Access System Migration
-- Idempotent script to set up feature flags and RLS policies for beta access

-- ============================================================================
-- PART 1: Core Tables and Functions
-- ============================================================================

-- Feature flags table for controlling beta access
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
  public_beta_enabled BOOLEAN NOT NULL DEFAULT false,
  beta_cap INT NOT NULL DEFAULT 150,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default feature flags if not exists
INSERT INTO feature_flags (id, public_beta_enabled, beta_cap)
VALUES (1, false, 150)
ON CONFLICT (id) DO NOTHING;

-- Add columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tips_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_quota INT DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invites_used INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Invite codes table for managing beta invitations
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  note TEXT,
  max_uses INT NOT NULL DEFAULT 1,
  uses INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlist applications for beta access
CREATE TABLE IF NOT EXISTS waitlist_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT,
  city_region TEXT,
  answers JSONB NOT NULL,
  score INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  referred_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_waitlist_email 
ON waitlist_applications (LOWER(email));

-- Helper function to check if public beta is enabled
CREATE OR REPLACE FUNCTION public_beta_enabled()
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
AS $$
  SELECT public_beta_enabled FROM feature_flags WHERE id = 1
$$;

-- Bootstrap trigger for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  INSERT INTO public.profiles (id) 
  VALUES (new.id) 
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 2: RLS Policies for Write Tables
-- ============================================================================

-- Helper function to create beta-only insert policies
CREATE OR REPLACE FUNCTION create_beta_insert_policy(
  table_name TEXT,
  policy_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  final_policy_name TEXT;
BEGIN
  -- Generate policy name if not provided
  final_policy_name := COALESCE(policy_name, table_name || '_insert_beta_check');
  
  -- Enable RLS on the table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Drop existing policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', final_policy_name, table_name);
  
  -- Create new insert policy
  EXECUTE format('
    CREATE POLICY %I ON %I
    FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND beta_access = true)
      OR public_beta_enabled()
    )',
    final_policy_name, table_name
  );
END;
$$;

-- Apply beta insert policies to all write tables

-- 1. User bags - where users create their golf bags
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bags') THEN
    PERFORM create_beta_insert_policy('user_bags');
  END IF;
END $$;

-- 2. Bag equipment - equipment added to bags
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_equipment') THEN
    PERFORM create_beta_insert_policy('bag_equipment');
  END IF;
END $$;

-- 3. Feed posts - social feed content
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_posts') THEN
    PERFORM create_beta_insert_policy('feed_posts');
  END IF;
END $$;

-- 4. Equipment photos - user uploaded equipment photos
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_photos') THEN
    PERFORM create_beta_insert_policy('equipment_photos');
  END IF;
END $$;

-- 5. Forum posts - if forum exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts') THEN
    PERFORM create_beta_insert_policy('forum_posts');
  END IF;
END $$;

-- 6. Forum replies - if forum exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_replies') THEN
    PERFORM create_beta_insert_policy('forum_replies');
  END IF;
END $$;

-- 7. Bag likes - users liking bags
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_likes') THEN
    PERFORM create_beta_insert_policy('bag_likes');
  END IF;
END $$;

-- 8. Bag tees - the "tee" system (like likes)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_tees') THEN
    PERFORM create_beta_insert_policy('bag_tees');
  END IF;
END $$;

-- 9. Equipment photo likes
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_photo_likes') THEN
    PERFORM create_beta_insert_policy('equipment_photo_likes');
  END IF;
END $$;

-- 10. Follows - users following each other
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    PERFORM create_beta_insert_policy('follows');
  END IF;
END $$;

-- 11. Likes table (general likes)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'likes') THEN
    PERFORM create_beta_insert_policy('likes');
  END IF;
END $$;

-- ============================================================================
-- PART 3: Verification Queries
-- ============================================================================

-- Create a view to check which tables have beta policies
CREATE OR REPLACE VIEW beta_policy_status AS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE policyname LIKE '%beta%'
ORDER BY tablename, policyname;

-- Function to get beta access status
CREATE OR REPLACE FUNCTION get_beta_status()
RETURNS TABLE (
  feature_flags_exists BOOLEAN,
  public_beta_enabled BOOLEAN,
  beta_cap INT,
  profiles_has_beta_columns BOOLEAN,
  invite_codes_exists BOOLEAN,
  waitlist_exists BOOLEAN,
  policies_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') AS feature_flags_exists,
    (SELECT ff.public_beta_enabled FROM feature_flags ff WHERE id = 1) AS public_beta_enabled,
    (SELECT ff.beta_cap FROM feature_flags ff WHERE id = 1) AS beta_cap,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'beta_access') AS profiles_has_beta_columns,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_codes') AS invite_codes_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist_applications') AS waitlist_exists,
    (SELECT COUNT(*)::INT FROM pg_policies WHERE policyname LIKE '%beta%') AS policies_count;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- Run: SELECT * FROM get_beta_status(); to verify the migration
-- ============================================================================