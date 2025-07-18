-- Simplified Storage Policies for user-content bucket
-- Run this in your Supabase SQL Editor

-- 1. First, drop all existing policies for clean slate
DROP POLICY IF EXISTS "Public can view user content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 2. Create simple, permissive policies

-- Allow anyone to view files in user-content bucket (public avatars)
CREATE POLICY "Anyone can view user-content" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user-content');

-- Allow authenticated users to upload to user-content bucket
CREATE POLICY "Authenticated can upload to user-content" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'user-content');

-- Allow authenticated users to update their own files
-- This checks if the file path contains their user ID
CREATE POLICY "Users can update own files" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'user-content' AND 
  (auth.uid()::text = ANY(string_to_array(name, '/')))
)
WITH CHECK (
  bucket_id = 'user-content' AND 
  (auth.uid()::text = ANY(string_to_array(name, '/')))
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'user-content' AND 
  (auth.uid()::text = ANY(string_to_array(name, '/')))
);

-- 3. Verify policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%user-content%'
ORDER BY policyname;

-- 4. Test query to check if policies work
SELECT 
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All storage policies created successfully!'
    ELSE '❌ Missing some policies. Expected 4, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%user-content%';