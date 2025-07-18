-- Final fix for storage policies - simpler approach
-- Run this in your Supabase SQL Editor

-- 1. First run the diagnostic to see current state
-- (Run diagnose-storage-policies.sql first)

-- 2. Drop ALL existing policies for storage.objects to start clean
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
  END LOOP;
END $$;

-- 3. Create very simple policies that will definitely work

-- Policy 1: Anyone can view any file in any bucket (simplest approach)
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (true);

-- Policy 2: Authenticated users can upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Authenticated users can update any file they uploaded
-- Note: 'owner' column tracks who uploaded the file
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

-- Policy 4: Authenticated users can delete files they uploaded
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- 4. Verify all policies were created
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    WHEN qual = '(true)' THEN 'Allow all (true)'
    ELSE 'Has conditions'
  END as using_status,
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK'
    WHEN with_check = '(true)' THEN 'Allow all (true)'
    ELSE 'Has conditions'
  END as check_status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 5. Final check
SELECT 
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All 4 storage policies created successfully!'
    WHEN COUNT(*) > 4 THEN '⚠️ More than 4 policies found. Count: ' || COUNT(*)
    ELSE '❌ Missing some policies. Expected 4, found: ' || COUNT(*)
  END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- 6. Test query - check if you can see files in user-content bucket
-- This should work for any authenticated user
SELECT 
  name,
  created_at,
  updated_at,
  owner
FROM storage.objects
WHERE bucket_id = 'user-content'
LIMIT 5;