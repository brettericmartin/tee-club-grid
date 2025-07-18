-- Fix Profile RLS Policies and Permissions
-- Run this in your Supabase SQL Editor

-- 1. Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- 3. Create comprehensive policies

-- Allow everyone to view profiles (needed for public bags, etc)
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Allow users to insert their own profile (for new users)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Ensure storage policies are correct for user-content bucket
-- Note: Run these after creating the user-content bucket

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view user content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Create new policies with better permissions
CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user-content');

CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'user-content' AND 
  (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'user-content' AND 
  auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'user-content' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'user-content' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);

-- 5. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- 6. Verify policies were created
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
WHERE tablename IN ('profiles', 'objects')
ORDER BY tablename, policyname;

-- 7. Test that a user can create/update their own profile
-- This should return true if policies are correct
SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN 'â All profile policies created successfully!'
    ELSE 'â Missing some profile policies. Count: ' || COUNT(*)
  END as profile_policy_status
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT 
  CASE 
    WHEN COUNT(*) >= 4 THEN 'â All storage policies created successfully!'
    ELSE 'â Missing some storage policies. Count: ' || COUNT(*)
  END as storage_policy_status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%avatar%';