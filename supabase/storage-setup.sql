-- Storage Bucket Setup for Equipment Photos
-- Run this in the Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-photos',
  'equipment-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Storage policies for equipment-photos bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload equipment photos" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'equipment-photos');

-- Allow public to view photos
CREATE POLICY "Allow public to view equipment photos" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'equipment-photos');

-- Allow users to update their own photos
CREATE POLICY "Allow users to update own equipment photos" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'equipment-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'equipment-photos');

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete own equipment photos" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'equipment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);