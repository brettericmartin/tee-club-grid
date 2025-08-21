-- Migration: Add soft-delete support to profiles table
-- This version works with the existing profiles.is_admin column (no admins table required)

-- 1. Add deleted_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create index for performance when filtering active profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at 
ON profiles(deleted_at) 
WHERE deleted_at IS NULL;

-- 3. Create index for beta access queries with soft-delete
CREATE INDEX IF NOT EXISTS idx_profiles_beta_active 
ON profiles(beta_access, deleted_at) 
WHERE beta_access = true AND deleted_at IS NULL;

-- 4. Function to check if a profile is active
CREATE OR REPLACE FUNCTION is_profile_active(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = check_user_id 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to soft-delete a profile
CREATE OR REPLACE FUNCTION soft_delete_profile(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  UPDATE profiles 
  SET deleted_at = NOW() 
  WHERE id = target_user_id 
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to restore a soft-deleted profile
CREATE OR REPLACE FUNCTION restore_profile(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_restored BOOLEAN;
BEGIN
  UPDATE profiles 
  SET deleted_at = NULL 
  WHERE id = target_user_id 
  AND deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS v_restored = ROW_COUNT;
  RETURN v_restored > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get beta access counts (active vs total)
CREATE OR REPLACE FUNCTION get_beta_counts()
RETURNS TABLE (
  active_count BIGINT,
  total_count BIGINT,
  deleted_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE beta_access = true AND deleted_at IS NULL) AS active_count,
    COUNT(*) FILTER (WHERE beta_access = true) AS total_count,
    COUNT(*) FILTER (WHERE beta_access = true AND deleted_at IS NOT NULL) AS deleted_count
  FROM profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update existing RLS policies to handle soft-deleted profiles
-- We'll update the existing policies to exclude soft-deleted profiles by default

-- First, let's check and drop any existing policies that might conflict
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by active users" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles including soft-deleted" ON profiles;

-- Create new policies that handle soft-delete properly

-- 8a. Public users can only see active (non-deleted) profiles
CREATE POLICY "Public can view active profiles" ON profiles
  FOR SELECT
  USING (deleted_at IS NULL);

-- 8b. Users can update their own profile (if not deleted)
CREATE POLICY "Users can update own profile if active" ON profiles
  FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id AND deleted_at IS NULL);

-- 8c. Admins (using profiles.is_admin) can see ALL profiles including soft-deleted
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.is_admin = true
    )
  );

-- 8d. Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.is_admin = true
    )
  );

-- 9. Grant permissions on new functions
GRANT EXECUTE ON FUNCTION is_profile_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_beta_counts() TO anon, authenticated;
-- soft_delete and restore functions should only be called by service role

-- 10. Add comments for documentation
COMMENT ON COLUMN profiles.deleted_at IS 'Timestamp when profile was soft-deleted. NULL means active profile.';
COMMENT ON FUNCTION is_profile_active(UUID) IS 'Check if a profile is active (not soft-deleted)';
COMMENT ON FUNCTION soft_delete_profile(UUID) IS 'Soft-delete a profile by setting deleted_at timestamp';
COMMENT ON FUNCTION restore_profile(UUID) IS 'Restore a soft-deleted profile by clearing deleted_at';
COMMENT ON FUNCTION get_beta_counts() IS 'Get beta access counts: active, total, and deleted';

-- 11. Verification queries
DO $$
DECLARE
  v_has_column BOOLEAN;
  v_count_active INTEGER;
  v_count_total INTEGER;
BEGIN
  -- Check if column was created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) INTO v_has_column;
  
  IF v_has_column THEN
    RAISE NOTICE '✅ Column deleted_at created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create deleted_at column';
  END IF;
  
  -- Count beta users
  SELECT COUNT(*) INTO v_count_active
  FROM profiles 
  WHERE beta_access = true AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_count_total
  FROM profiles 
  WHERE beta_access = true;
  
  RAISE NOTICE '📊 Beta user counts:';
  RAISE NOTICE '   Active: %', v_count_active;
  RAISE NOTICE '   Total: %', v_count_total;
  RAISE NOTICE '   Soft-deleted: %', v_count_total - v_count_active;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Soft-delete migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 What was added:';
  RAISE NOTICE '   - Column: profiles.deleted_at';
  RAISE NOTICE '   - Functions: is_profile_active(), soft_delete_profile(), restore_profile(), get_beta_counts()';
  RAISE NOTICE '   - RLS policies updated to handle soft-deleted profiles';
  RAISE NOTICE '   - Admins (profiles.is_admin=true) can see all profiles';
  RAISE NOTICE '   - Regular users only see active profiles';
END $$;