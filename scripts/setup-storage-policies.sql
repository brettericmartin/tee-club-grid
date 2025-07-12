-- Storage policies for equipment-photos bucket
-- Run these in Supabase SQL Editor

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'equipment-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'equipment-photos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Equipment photos table RLS policies
-- Enable RLS
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view photos
CREATE POLICY "Anyone can view equipment photos" ON equipment_photos
FOR SELECT TO public
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can add photos" ON equipment_photos
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos" ON equipment_photos
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos" ON equipment_photos
FOR DELETE TO authenticated
USING (auth.uid() = user_id);