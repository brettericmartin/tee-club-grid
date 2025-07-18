-- Profile System Fix - Clean Version (No Syntax Errors)
-- Based on the actual database schema

-- ================================================================
-- STEP 1: Enable RLS on profiles table
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 2: Drop and recreate profile policies
-- ================================================================

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Create new policies with simple names
CREATE POLICY "allow_public_read" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "allow_user_insert" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_user_update" 
ON profiles FOR UPDATE
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- ================================================================
-- STEP 3: Fix any data issues
-- ================================================================

-- Since display_name is NOT NULL, ensure all rows have a value
UPDATE profiles 
SET display_name = username
WHERE display_name IS NULL OR display_name = '';

-- ================================================================
-- STEP 4: Ensure storage bucket exists and is public
-- ================================================================
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'user-content', 
      'user-content', 
      true,
      5242880, -- 5MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
    RAISE NOTICE 'Created user-content bucket';
  ELSE
    -- Ensure it is public
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'user-content';
    RAISE NOTICE 'Ensured user-content bucket is public';
  END IF;
END $$;

-- ================================================================
-- STEP 5: Fix storage policies
-- ================================================================

-- Drop ALL existing storage policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create simple storage policies
-- 1. Anyone can view files in user-content bucket
CREATE POLICY "public_avatar_access"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- 2. Authenticated users can upload to avatars folder
CREATE POLICY "auth_avatar_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- 3. Users can update their own files (based on owner)
CREATE POLICY "user_update_own"
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

-- 4. Users can delete their own files
CREATE POLICY "user_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' 
  AND owner = auth.uid()
);

-- Grant storage permissions
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- ================================================================
-- STEP 6: Verification
-- ================================================================

-- Check profile policies
SELECT 
  'Profile Policies' as check_type,
  COUNT(*) as count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check storage policies  
SELECT 
  'Storage Policies' as check_type,
  COUNT(*) as count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Check bucket
SELECT 
  'Storage Bucket' as check_type,
  id,
  public,
  CASE 
    WHEN public THEN 'Public access enabled'
    ELSE 'Not public - avatars will not display!'
  END as status
FROM storage.buckets 
WHERE id = 'user-content';

-- Final status
DO $$
DECLARE
  profile_count INTEGER;
  storage_count INTEGER;
  bucket_public BOOLEAN;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO profile_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  SELECT COUNT(*) INTO storage_count
  FROM pg_policies 
  WHERE schemaname = 'storage' AND tablename = 'objects';
  
  SELECT public INTO bucket_public
  FROM storage.buckets 
  WHERE id = 'user-content';
  
  -- Report
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile System Fix Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile policies: %', profile_count;
  RAISE NOTICE 'Storage policies: %', storage_count;
  RAISE NOTICE 'Bucket is public: %', COALESCE(bucket_public, false);
  RAISE NOTICE '';
  
  IF profile_count >= 3 AND storage_count >= 4 AND COALESCE(bucket_public, false) THEN
    RAISE NOTICE 'Everything looks good!';
  ELSE
    RAISE NOTICE 'Some issues may remain. Check the output above.';
  END IF;
END $$;