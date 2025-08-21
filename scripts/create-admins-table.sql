-- Migration: Create dedicated admins table for proper authorization
-- This replaces the is_admin column approach with a dedicated table

-- Create the admins table
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT admins_user_id_key UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Only admins can view the admins table
CREATE POLICY "Admins can view admins table" ON admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- No one can insert/update/delete through the app (must be done via SQL console)
-- This prevents privilege escalation attacks

-- Function to check if a specific user is an admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_admin() TO authenticated;

-- Migrate existing admins from profiles table (if any)
-- This will copy any users with is_admin=true to the new admins table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    INSERT INTO admins (user_id, notes)
    SELECT id, 'Migrated from profiles.is_admin'
    FROM profiles
    WHERE is_admin = true
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Migrated % admins from profiles table', 
      (SELECT COUNT(*) FROM profiles WHERE is_admin = true);
  END IF;
END $$;

-- Update existing RLS policies to use the new admins table
-- Example for forum moderation (adjust based on your needs)

-- Drop old policies that use profiles.is_admin
DROP POLICY IF EXISTS "Admins can delete any thread" ON forum_threads;
DROP POLICY IF EXISTS "Admins can delete any post" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own threads or admins can update any" ON forum_threads;
DROP POLICY IF EXISTS "Users can update own posts or admins can update any" ON forum_posts;

-- Create new policies using admins table
CREATE POLICY "Admins can delete any thread" ON forum_threads
  FOR DELETE
  USING (current_user_is_admin());

CREATE POLICY "Admins can delete any post" ON forum_posts
  FOR DELETE
  USING (
    auth.uid() = user_id OR current_user_is_admin()
  );

CREATE POLICY "Users can update own threads or admins can update any" ON forum_threads
  FOR UPDATE
  USING (
    auth.uid() = user_id OR current_user_is_admin()
  );

CREATE POLICY "Users can update own posts or admins can update any" ON forum_posts
  FOR UPDATE
  USING (
    auth.uid() = user_id OR current_user_is_admin()
  );

-- Create RLS policies for waitlist management
CREATE POLICY "Admins can view all waitlist applications" ON waitlist_applications
  FOR SELECT
  USING (current_user_is_admin());

CREATE POLICY "Admins can update waitlist applications" ON waitlist_applications
  FOR UPDATE
  USING (current_user_is_admin());

-- Add comment for documentation
COMMENT ON TABLE admins IS 'Stores admin users with audit trail. Only manageable via SQL console for security.';
COMMENT ON FUNCTION current_user_is_admin() IS 'Returns true if the current authenticated user is an admin';
COMMENT ON FUNCTION is_admin(UUID) IS 'Returns true if the specified user ID is an admin';