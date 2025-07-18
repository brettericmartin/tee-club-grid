-- Fix equipment photo RLS policies to allow community contributions
-- This allows any authenticated user to add photos to any equipment

-- First, drop the restrictive policies
DROP POLICY IF EXISTS "Users can upload own photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can upload equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can create their own equipment photos" ON equipment_photos;

-- Create new policy that allows any authenticated user to upload photos
CREATE POLICY "Authenticated users can upload equipment photos" ON equipment_photos
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure view policy exists and is open
DROP POLICY IF EXISTS "Equipment photos are viewable by everyone" ON equipment_photos;
CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

-- Keep update/delete policies restricted to photo owners
DROP POLICY IF EXISTS "Users can update own photos" ON equipment_photos;
CREATE POLICY "Users can update own photos" ON equipment_photos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own photos" ON equipment_photos;
CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Also ensure the storage bucket policies allow authenticated uploads
-- Note: This needs to be done in Supabase dashboard under Storage policies
-- The equipment-photos bucket should have:
-- - SELECT: public (anyone can view)
-- - INSERT: authenticated (any logged-in user can upload)
-- - UPDATE: owner only
-- - DELETE: owner only

-- Grant necessary permissions
GRANT ALL ON equipment_photos TO authenticated;
GRANT SELECT ON equipment_photos TO anon;

-- Add helpful notice
DO $$
BEGIN
  RAISE NOTICE 'Equipment photo RLS policies updated!';
  RAISE NOTICE 'Any authenticated user can now upload photos for any equipment.';
  RAISE NOTICE 'Users can only update/delete their own photos.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Also check Storage bucket policies in Supabase dashboard!';
  RAISE NOTICE 'The equipment-photos bucket should allow authenticated users to INSERT.';
END $$;