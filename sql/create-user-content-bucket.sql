-- Create user-content bucket for profile avatars and other user uploads
-- Run this in your Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-content',
  'user-content',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view user content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Set up storage policies
CREATE POLICY "Public can view user content" ON storage.objects
FOR SELECT USING (bucket_id = 'user-content');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-content');

CREATE POLICY "Users can update own uploads" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'user-content' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user-content');

CREATE POLICY "Users can delete own uploads" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'user-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'user-content';