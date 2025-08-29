-- ============================================================================
-- SIMPLE FIX: Allow Profile Creation Without Auth
-- ============================================================================
-- This removes the bullshit RLS that's blocking signups
-- ============================================================================

BEGIN;

-- 1. Drop ALL existing policies on profiles table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore if doesn't exist
        END;
    END LOOP;
END $$;

-- 2. Enable RLS (required for Supabase)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create SIMPLE policies that actually work

-- Anyone can read profiles (for public pages)
CREATE POLICY "profiles_public_read" 
    ON profiles FOR SELECT 
    USING (true);

-- Anyone can create a profile (for signups)
CREATE POLICY "profiles_anyone_insert" 
    ON profiles FOR INSERT 
    WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "profiles_user_update" 
    ON profiles FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role bypasses everything (for admin operations)
CREATE POLICY "profiles_service_role" 
    ON profiles FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Grant necessary permissions
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 5. Make sure the columns we need exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 6. Add constraints if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_username_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

COMMIT;

-- Verify it worked
SELECT 
    'Profiles table RLS is now fixed!' as message,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE beta_access = true) as beta_users,
    150 - COUNT(*) FILTER (WHERE beta_access = true) as spots_remaining
FROM profiles;