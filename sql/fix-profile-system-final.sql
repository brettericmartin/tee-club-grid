-- Profile System Fix - Final Version
-- This SQL is tested and aligned with the actual schema

-- ================================================================
-- STEP 1: Enable RLS on profiles table
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 2: Ensure display_name column exists
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
    RAISE NOTICE 'Added display_name column';
  ELSE
    RAISE NOTICE 'display_name column already exists';
  END IF;
END $$;

-- ================================================================
-- STEP 3: Drop and recreate profile policies
-- ================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Create new policies
CREATE POLICY "profiles_select_policy" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "profiles_insert_policy" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" 
ON profiles FOR UPDATE
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- ================================================================
-- STEP 4: Ensure storage bucket exists and is public
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('user-content', 'user-content', true);
    RAISE NOTICE 'Created user-content bucket';
  ELSE
    UPDATE storage.buckets SET public = true WHERE id = 'user-content';
    RAISE NOTICE 'Ensured user-content bucket is public';
  END IF;
END $$;

-- ================================================================
-- STEP 5: Fix storage policies
-- ================================================================

-- First, drop existing storage policies for user-content
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (
      policyname LIKE '%user-content%' 
      OR policyname LIKE '%avatar%'
      OR policyname LIKE '%Avatar%'
      OR policyname LIKE '%upload%'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create new storage policies
CREATE POLICY "storage_avatars_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

CREATE POLICY "storage_avatars_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "storage_avatars_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid())
WITH CHECK (bucket_id = 'user-content' AND owner = auth.uid());

CREATE POLICY "storage_avatars_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid());

-- ================================================================
-- STEP 6: Update existing profiles with display_name
-- ================================================================
UPDATE profiles 
SET display_name = COALESCE(display_name, full_name, username, 'User')
WHERE display_name IS NULL;

-- ================================================================
-- STEP 7: Verification
-- ================================================================

-- Check profiles policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  IF policy_count >= 3 THEN
    RAISE NOTICE '✅ Profile policies created successfully (% policies)', policy_count;
  ELSE
    RAISE WARNING '❌ Missing profile policies (only % found)', policy_count;
  END IF;
END $$;

-- Check storage policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'storage_avatars_%';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ Storage policies created successfully (% policies)', policy_count;
  ELSE
    RAISE WARNING '❌ Missing storage policies (only % found)', policy_count;
  END IF;
END $$;

-- Check bucket status
DO $$
DECLARE
  bucket_public BOOLEAN;
BEGIN
  SELECT public INTO bucket_public
  FROM storage.buckets 
  WHERE id = 'user-content';
  
  IF bucket_public THEN
    RAISE NOTICE '✅ user-content bucket is public';
  ELSE
    RAISE WARNING '❌ user-content bucket is not public';
  END IF;
END $$;

-- Show summary
SELECT 'Profile System Status' as info,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as profile_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'storage_avatars_%') as storage_policies,
  (SELECT public FROM storage.buckets WHERE id = 'user-content') as bucket_is_public;