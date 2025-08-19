-- Add Admin System to Teed.club
-- This script adds admin capabilities to the platform

-- 1. Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin 
ON profiles(is_admin) 
WHERE is_admin = true;

-- 3. Update RLS policies for forum_threads to allow admin actions

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own threads" ON forum_threads;

-- Create new update policy that allows admins to update any thread
CREATE POLICY "Users can update own threads or admins can update any" 
ON forum_threads 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- 4. Create policy for admins to delete any thread
CREATE POLICY "Admins can delete any thread" 
ON forum_threads 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- 5. Update RLS policies for forum_posts to allow admin actions

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;

-- Create new update policy that allows admins to update any post
CREATE POLICY "Users can update own posts or admins can update any" 
ON forum_posts 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- 6. Create policy for admins to delete any post
CREATE POLICY "Admins can delete any post" 
ON forum_posts 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- 7. Create a function to check if a user is admin (for use in app)
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_user_admin TO authenticated;

-- 9. Set yourself as admin (replace with your actual user ID)
-- You'll need to run this separately with your actual user ID:
-- UPDATE profiles SET is_admin = true WHERE username = 'brettmartinplay';

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Admin system setup complete!';
  RAISE NOTICE 'Remember to set admin users with: UPDATE profiles SET is_admin = true WHERE username = ''your_username'';';
END $$;