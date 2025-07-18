-- Quick Profile System Status Check
-- Run this first to see the current state

-- 1. Check if profiles table exists and show columns
SELECT 
  'Profiles Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check current RLS policies on profiles
SELECT 
  'Profile RLS Policies' as check_type,
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 3. Check storage policies
SELECT 
  'Storage Policies' as check_type,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (policyname LIKE '%user%' OR policyname LIKE '%avatar%' OR policyname LIKE '%Avatar%');

-- 4. Check storage buckets
SELECT 
  'Storage Buckets' as check_type,
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'user-content';

-- 5. Count profiles
SELECT 
  'Profile Count' as check_type,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT username) as unique_usernames,
  COUNT(display_name) as profiles_with_display_name,
  COUNT(avatar_url) as profiles_with_avatar
FROM profiles;