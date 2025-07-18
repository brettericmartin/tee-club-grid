-- Simple Profile Fix - Copy and Paste This
-- No syntax errors, no special characters

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_public_read" ON profiles;
DROP POLICY IF EXISTS "allow_user_insert" ON profiles;
DROP POLICY IF EXISTS "allow_user_update" ON profiles;

-- Create profile policies
CREATE POLICY "allow_public_read" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "allow_user_insert" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_user_update" 
ON profiles FOR UPDATE
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Fix storage bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'user-content';

-- Drop existing storage policies
DROP POLICY IF EXISTS "public_avatar_access" ON storage.objects;
DROP POLICY IF EXISTS "auth_avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "user_update_own" ON storage.objects;
DROP POLICY IF EXISTS "user_delete_own" ON storage.objects;

-- Create storage policies
CREATE POLICY "public_avatar_access"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

CREATE POLICY "auth_avatar_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "user_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-content' 
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'user-content' 
  AND owner = auth.uid()
);

CREATE POLICY "user_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' 
  AND owner = auth.uid()
);

-- Done
SELECT 'Profile system fixed!' as status;