-- Check avatar storage status
-- Run this in Supabase SQL Editor

-- 1. Check storage bucket configuration
SELECT 
  name,
  public,
  avif_autodetection,
  created_at
FROM storage.buckets 
WHERE name = 'user-content';

-- 2. Check storage objects (files)
SELECT 
  COUNT(*) as total_objects,
  COUNT(CASE WHEN name LIKE 'avatars/%' THEN 1 END) as avatar_count,
  COUNT(CASE WHEN metadata->>'size' = '0' THEN 1 END) as empty_files,
  COUNT(CASE WHEN metadata->>'size' IS NULL THEN 1 END) as no_size_metadata
FROM storage.objects 
WHERE bucket_id = 'user-content';

-- 3. List recent avatar uploads
SELECT 
  name,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'user-content' 
  AND name LIKE 'avatars/%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check profiles with avatar URLs
SELECT 
  COUNT(*) as total_profiles,
  COUNT(avatar_url) as profiles_with_avatar,
  COUNT(CASE WHEN avatar_url LIKE '%user-content%' THEN 1 END) as using_user_content_bucket
FROM profiles;

-- 5. Sample avatar URLs from profiles
SELECT 
  id,
  username,
  avatar_url,
  updated_at
FROM profiles 
WHERE avatar_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 6. Check for any RLS policies on storage.objects
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';