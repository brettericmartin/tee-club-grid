-- Fix Avatar Storage Policies and Profile Issues
-- Run this in your Supabase SQL Editor

-- 1. First, check current storage policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 2. Drop ALL existing storage policies to start fresh
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

-- 3. Create comprehensive storage policies for avatars

-- Allow anyone to view files in user-content bucket
CREATE POLICY "Anyone can view user content"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- Allow authenticated users to upload to avatars folder
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to update their own avatar files
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own avatar files
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- 4. Ensure the user-content bucket exists and is public
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'user-content',
      'user-content',
      true, -- Public bucket
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    );
    RAISE NOTICE 'Created user-content bucket';
  ELSE
    -- Ensure bucket is public
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'user-content';
    RAISE NOTICE 'Ensured user-content bucket is public';
  END IF;
END $$;

-- 5. Fix the profiles table - add display_name if missing
DO $$
BEGIN
  -- Check if display_name column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    -- Add display_name column
    ALTER TABLE profiles ADD COLUMN display_name text;
    RAISE NOTICE 'Added display_name column to profiles table';
  END IF;
  
  -- Set display_name to username where display_name is null
  UPDATE profiles 
  SET display_name = COALESCE(display_name, username)
  WHERE display_name IS NULL;
  
  RAISE NOTICE 'Migrated display names';
END $$;

-- 6. Ensure proper RLS policies on profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate with proper permissions
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 7. Grant proper permissions
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- 8. Verify everything was created correctly
SELECT 
  'Storage Policies' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Storage policies created successfully!'
    ELSE '❌ Missing some storage policies. Expected 4+, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
UNION ALL
SELECT 
  'Profile Policies' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ Profile policies created successfully!'
    ELSE '❌ Missing some profile policies. Expected 3, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
  'User Content Bucket' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content' AND public = true) THEN 1 ELSE 0 END as count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-content' AND public = true) THEN '✅ user-content bucket is public!'
    ELSE '❌ user-content bucket missing or not public'
  END as status
UNION ALL
SELECT 
  'Display Name Column' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
  ) THEN 1 ELSE 0 END as count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
    ) THEN '✅ display_name column exists!'
    ELSE '❌ display_name column missing'
  END as status;

-- 9. Show current storage policies for verification
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual LIKE '%user-content%' THEN '✅ Includes user-content'
    ELSE '❌ No user-content filter'
  END as bucket_filter
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;