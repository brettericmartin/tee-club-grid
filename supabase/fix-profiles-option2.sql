-- Option 2: Create a more permissive insert policy for profiles

-- First, check what policies currently exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Create the insert policy for authenticated users
CREATE POLICY "Enable insert for authenticated users only" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';