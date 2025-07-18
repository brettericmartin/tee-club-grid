-- Diagnostic script to check storage policies
-- Run this in your Supabase SQL Editor

-- 1. Check ALL storage policies (not just user-content)
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
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 2. Check specifically for user-content policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user-content%' THEN 'Has user-content in USING'
    ELSE 'No user-content in USING'
  END as using_clause,
  CASE 
    WHEN with_check LIKE '%user-content%' THEN 'Has user-content in WITH CHECK'
    ELSE 'No user-content in WITH CHECK'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%user-content%' OR qual LIKE '%user-content%' OR with_check LIKE '%user-content%');

-- 3. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 4. Check current user permissions
SELECT current_user, current_role;

-- 5. List all storage buckets
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;

-- 6. Check if there are any conflicting policies
SELECT 
  COUNT(*) as total_policies,
  COUNT(CASE WHEN policyname LIKE '%user%' THEN 1 END) as user_related_policies,
  COUNT(CASE WHEN policyname LIKE '%avatar%' THEN 1 END) as avatar_related_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';