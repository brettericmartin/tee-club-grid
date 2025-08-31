-- Fix Equipment RLS Policies
-- This makes equipment table readable by everyone (public)

-- First, check if RLS is enabled
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "Users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update their own equipment" ON equipment;
DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment;
DROP POLICY IF EXISTS "Public read access" ON equipment;

-- Create new policy for public read access
CREATE POLICY "Equipment is viewable by everyone" 
ON equipment 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert equipment
CREATE POLICY "Users can insert equipment"
ON equipment
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update equipment they added (or admins)
CREATE POLICY "Users can update their own equipment"
ON equipment
FOR UPDATE
USING (
  added_by_user_id = auth.uid() 
  OR auth.uid() IN (SELECT user_id FROM admins)
  OR added_by_user_id IS NULL
)
WITH CHECK (
  added_by_user_id = auth.uid() 
  OR auth.uid() IN (SELECT user_id FROM admins)
  OR added_by_user_id IS NULL
);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'equipment';