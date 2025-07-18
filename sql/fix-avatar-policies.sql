-- Fix Avatar Storage Policies
-- Run this in Supabase SQL Editor

-- First, let's check the current policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Check if there are any conflicting policies
-- The issue might be that we have two INSERT policies for authenticated users

-- Option 1: Drop the specific avatar policy if it's causing conflicts
-- DROP POLICY IF EXISTS "auth_avatar_upload" ON storage.objects;

-- Option 2: Update the general authenticated insert policy to be more specific
-- This combines both policies into one comprehensive policy
BEGIN;

-- First, drop the conflicting policies
DROP POLICY IF EXISTS "auth_avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to user-content" ON storage.objects;

-- Create a single, comprehensive insert policy
CREATE POLICY "Authenticated users can upload to user-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content'::text
);

COMMIT;

-- Verify the policies after update
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Also check if files are actually being stored
SELECT 
  COUNT(*) as total_files,
  COUNT(CASE WHEN name LIKE 'avatars/%' THEN 1 END) as avatar_files,
  COUNT(CASE WHEN metadata->>'size' = '0' THEN 1 END) as empty_files,
  COUNT(CASE WHEN owner IS NULL THEN 1 END) as no_owner
FROM storage.objects
WHERE bucket_id = 'user-content';

-- List recent uploads to see if they're working
SELECT 
  id,
  name,
  owner,
  metadata->>'size' as size,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'user-content'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;