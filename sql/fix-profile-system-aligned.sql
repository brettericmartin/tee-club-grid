-- Profile System Fix - Aligned with Current Schema
-- This script checks the actual schema before making changes

-- ================================================================
-- STEP 1: Check Current Schema
-- ================================================================

DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check what columns actually exist in profiles table
  RAISE NOTICE 'Checking current profiles table schema...';
  
  -- List all columns
  FOR column_exists IN 
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column found: %', column_exists;
  END LOOP;
END $$;

-- ================================================================
-- STEP 2: Ensure Required Columns Exist
-- ================================================================

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
    RAISE NOTICE 'Added username column';
  END IF;
END $$;

-- Add display_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
    RAISE NOTICE 'Added display_name column';
  END IF;
END $$;

-- Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
    RAISE NOTICE 'Added avatar_url column';
  END IF;
END $$;

-- ================================================================
-- STEP 3: Fix RLS on Profiles Table
-- ================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
  policy_rec record;
BEGIN
  FOR policy_rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_rec.policyname);
  END LOOP;
END $$;

-- Create simple policies
CREATE POLICY "Enable read access for all users" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" 
ON profiles FOR UPDATE
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- ================================================================
-- STEP 4: Storage Bucket Setup
-- ================================================================

-- Ensure user-content bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-content',
  'user-content',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) 
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- ================================================================
-- STEP 5: Storage Policies
-- ================================================================

-- Drop all existing storage policies
DO $$
DECLARE
  policy_rec record;
BEGIN
  FOR policy_rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_rec.policyname);
  END LOOP;
END $$;

-- Create new storage policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid())
WITH CHECK (bucket_id = 'user-content' AND owner = auth.uid());

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid());

-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- ================================================================
-- STEP 6: Set Default Values for Existing Rows
-- ================================================================

-- Only update display_name if the column exists and is null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    UPDATE profiles 
    SET display_name = id::text 
    WHERE display_name IS NULL;
  END IF;
END $$;

-- ================================================================
-- STEP 7: Verification
-- ================================================================

-- Check final schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check policies
SELECT 
  'Profiles' as table_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Profile policies created'
    ELSE '❌ Missing profile policies'
  END as status
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
  'Storage' as table_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Storage policies created'
    ELSE '❌ Missing storage policies'
  END as status
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check bucket status
SELECT 
  name as bucket_name,
  public,
  CASE 
    WHEN public THEN '✅ Bucket is public'
    ELSE '❌ Bucket is not public'
  END as status
FROM storage.buckets
WHERE name = 'user-content';

-- Final message
DO $$
BEGIN
  RAISE NOTICE E'\n✅ Profile system fix complete!\n\nPlease test:\n1. Profile updates\n2. Avatar uploads\n3. Run: node scripts/test-profile-permissions.js';
END $$;