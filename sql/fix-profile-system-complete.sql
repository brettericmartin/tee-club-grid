-- Complete Profile System Fix
-- Run this in your Supabase SQL Editor to fix all profile and avatar issues
-- Last updated: 2024

-- ================================================================
-- STEP 1: Fix Profile Table Schema
-- ================================================================

-- 1.1 Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1.2 Make username nullable to prevent conflicts (optional but recommended)
-- This allows profiles to be created without username conflicts
DO $$
BEGIN
  -- Check if username has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;
    RAISE NOTICE 'Made username column nullable';
  END IF;
END $$;

-- 1.3 Ensure display_name column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
    RAISE NOTICE 'Added display_name column';
  END IF;
END $$;

-- 1.4 Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- ================================================================
-- STEP 2: Fix Profile RLS Policies
-- ================================================================

-- 2.1 Drop all existing profile policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 2.2 Create clean, simple profile policies
CREATE POLICY "Anyone can view profiles" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own profile" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2.3 Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- ================================================================
-- STEP 3: Ensure Storage Bucket Exists
-- ================================================================

-- 3.1 Create user-content bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-content',
  'user-content',
  true, -- MUST be public for avatars to display
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- ================================================================
-- STEP 4: Fix Storage Policies
-- ================================================================

-- 4.1 Drop ALL existing storage policies to start fresh
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 4.2 Create simple, working storage policies

-- Allow anyone to view files in user-content bucket
CREATE POLICY "Public access to user-content"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-content'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'user-content'
  AND owner = auth.uid()
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content'
  AND owner = auth.uid()
);

-- ================================================================
-- STEP 5: Grant Storage Permissions
-- ================================================================

GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- ================================================================
-- STEP 6: Fix Existing Data
-- ================================================================

-- 6.1 Set display_name for users who don't have one
UPDATE profiles 
SET display_name = COALESCE(display_name, username)
WHERE display_name IS NULL;

-- 6.2 Fix any duplicate usernames by appending user ID
DO $$
DECLARE
  dup record;
  new_username text;
  counter int;
BEGIN
  -- Find all duplicate usernames
  FOR dup IN 
    SELECT username, array_agg(id) as ids
    FROM profiles
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Fix each duplicate except the first one
    FOR i IN 2..array_length(dup.ids, 1) LOOP
      counter := 1;
      new_username := dup.username || '_' || counter;
      
      -- Find a unique username
      WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := dup.username || '_' || counter;
      END LOOP;
      
      -- Update the duplicate
      UPDATE profiles 
      SET username = new_username
      WHERE id = dup.ids[i];
      
      RAISE NOTICE 'Fixed duplicate username % for user %', dup.username, dup.ids[i];
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- STEP 7: Create Helper Function for Username Generation
-- ================================================================

CREATE OR REPLACE FUNCTION generate_unique_username(base_username text, user_id uuid)
RETURNS text AS $$
DECLARE
  new_username text;
  counter int := 0;
BEGIN
  -- Start with base username
  new_username := base_username;
  
  -- Check if it exists
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username AND id != user_id) LOOP
    counter := counter + 1;
    new_username := base_username || '_' || counter;
  END LOOP;
  
  RETURN new_username;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 8: Verification Queries
-- ================================================================

-- 8.1 Check profile policies
SELECT 
  'Profile RLS' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All profile policies created!'
    ELSE '❌ Missing profile policies. Expected 3, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'profiles';

-- 8.2 Check storage policies
SELECT 
  'Storage Policies' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Storage policies created!'
    ELSE '❌ Missing storage policies. Expected 4+, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- 8.3 Check bucket configuration
SELECT 
  'User Content Bucket' as check_type,
  1 as policy_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content' AND public = true) 
    THEN '✅ user-content bucket is public!'
    ELSE '❌ user-content bucket missing or not public'
  END as status;

-- 8.4 Check for duplicate usernames
SELECT 
  'Duplicate Usernames' as check_type,
  COUNT(DISTINCT username) as policy_count,
  CASE 
    WHEN NOT EXISTS (
      SELECT username 
      FROM profiles 
      WHERE username IS NOT NULL 
      GROUP BY username 
      HAVING COUNT(*) > 1
    ) THEN '✅ No duplicate usernames!'
    ELSE '❌ Duplicate usernames exist'
  END as status;

-- 8.5 Show current policies
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN roles = '{authenticated}' THEN 'Authenticated users'
    WHEN roles = '{anon}' THEN 'Anonymous users'
    ELSE 'All users'
  END as applies_to
FROM pg_policies 
WHERE tablename IN ('profiles', 'objects')
ORDER BY tablename, policyname;

-- ================================================================
-- FINAL MESSAGE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE E'\n\n✅ Profile system fix complete!\n\nNext steps:\n1. Test profile creation and updates\n2. Test avatar uploads\n3. Run: node scripts/debug-profile-issues.js\n\nIf you still have issues, check:\n- Browser console for errors\n- Network tab for failed requests\n- Supabase logs for RLS violations';
END $$;