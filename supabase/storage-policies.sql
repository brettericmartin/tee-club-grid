-- Run this AFTER creating the equipment-images bucket in the dashboard

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public can view all images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'equipment-images');

-- Policy 2: Authenticated users can upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

-- Policy 3: Users can update their own uploads
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'equipment-images');

-- Policy 4: Users can delete their own uploads
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid() = owner AND bucket_id = 'equipment-images');

-- Check if policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';