-- Fix Storage CORS Issues
-- Run this in Supabase SQL Editor

-- 1. Ensure bucket is PUBLIC (critical for CORS)
UPDATE storage.buckets 
SET public = true,
    avif_autodetection = false,
    file_size_limit = 5242880
WHERE id = 'user-content';

-- 2. Check current bucket settings
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  avif_autodetection,
  created_at,
  updated_at
FROM storage.buckets 
WHERE id = 'user-content';

-- 3. Recreate storage policies with explicit public access
-- Drop all existing policies first
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND qual::text LIKE '%user-content%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create new simplified policies
CREATE POLICY "Anyone can view user-content files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

CREATE POLICY "Authenticated can upload to user-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-content');

CREATE POLICY "Users can update own files in user-content"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid());

CREATE POLICY "Users can delete own files in user-content"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-content' AND owner = auth.uid());

-- 4. Grant proper permissions
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;

-- 5. Verify setup
SELECT 
  'Bucket Status' as check,
  CASE 
    WHEN public THEN 'PUBLIC (Good for CORS)'
    ELSE 'NOT PUBLIC (Will cause CORS issues!)'
  END as status
FROM storage.buckets 
WHERE id = 'user-content';

-- Show all policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%user-content%'
ORDER BY policyname;