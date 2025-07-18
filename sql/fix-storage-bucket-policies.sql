-- Fix storage bucket policies for equipment-photos
-- Run this in Supabase SQL editor

-- Enable RLS on storage.objects for the equipment-photos bucket
-- Note: This affects the storage.objects table, not the bucket itself

-- First, ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies for equipment-photos bucket
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload equipment photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own equipment photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own equipment photos" ON storage.objects;

-- Create new policies for equipment-photos bucket

-- 1. Anyone can view equipment photos (public read)
CREATE POLICY "Anyone can view equipment photos" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'equipment-photos');

-- 2. Authenticated users can upload equipment photos
CREATE POLICY "Authenticated users can upload equipment photos" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'equipment-photos' 
    AND auth.role() = 'authenticated'
  );

-- 3. Users can only update their own uploads
CREATE POLICY "Users can update own equipment photos" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'equipment-photos' 
    AND auth.uid() = owner
  );

-- 4. Users can only delete their own uploads
CREATE POLICY "Users can delete own equipment photos" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'equipment-photos' 
    AND auth.uid() = owner
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Storage bucket policies updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'Equipment-photos bucket now has:';
  RAISE NOTICE '✅ Public viewing (anyone can see photos)';
  RAISE NOTICE '✅ Authenticated upload (logged-in users can add photos)';
  RAISE NOTICE '✅ Owner-only update/delete (only uploader can modify/remove)';
  RAISE NOTICE '';
  RAISE NOTICE 'This is more secure than having no policies!';
END $$;