-- Enable RLS on equipment_photos table
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view all equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can add equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can update their own equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can delete their own equipment photos" ON equipment_photos;

-- Create new policies

-- Allow public read access to all equipment photos
CREATE POLICY "Public can view all equipment photos" 
ON equipment_photos 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert photos
CREATE POLICY "Authenticated users can add equipment photos" 
ON equipment_photos 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own equipment photos" 
ON equipment_photos 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own equipment photos" 
ON equipment_photos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON equipment_photos TO anon;
GRANT SELECT ON equipment_photos TO authenticated;
GRANT ALL ON equipment_photos TO authenticated;