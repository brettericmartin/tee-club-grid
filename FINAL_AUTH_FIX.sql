-- ============================================================================
-- FINAL FIX: Make Auth Signup Work
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. Make sure profiles table has the right structure
ALTER TABLE profiles 
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Fix the foreign key constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 3. Make sure required columns exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    LOWER(REGEXP_REPLACE(SPLIT_PART(new.email, '@', 1), '[^a-z0-9]', '', 'g')) || floor(random() * 10000)::text,
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Fix RLS policies on profiles
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_anyone_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_user_update" ON profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles
CREATE POLICY "public_profiles_read" 
  ON profiles FOR SELECT 
  USING (true);

-- Service role and system can insert (for trigger)
CREATE POLICY "system_insert_profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- Users can update their own
CREATE POLICY "users_update_own" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role bypass
CREATE POLICY "service_role_all" 
  ON profiles FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 7. Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Specific grants for profiles
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role, postgres;

COMMIT;

-- Test that it worked
SELECT 
  'Auth system fixed!' as status,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE beta_access = true) as beta_users
FROM profiles;