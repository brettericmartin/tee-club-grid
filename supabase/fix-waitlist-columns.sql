-- ====================================================================
-- FIX MISSING COLUMNS IN WAITLIST_APPLICATIONS TABLE
-- ====================================================================

-- Add missing columns to waitlist_applications table
ALTER TABLE waitlist_applications 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE waitlist_applications 
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have updated_at if they don't
UPDATE waitlist_applications 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_waitlist_applications_updated_at ON waitlist_applications;

CREATE TRIGGER update_waitlist_applications_updated_at
  BEFORE UPDATE ON waitlist_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Also ensure profiles table has updated_at
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger for profiles too
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('waitlist_applications', 'profiles')
  AND column_name IN ('updated_at', 'approved_at')
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ COLUMNS FIXED!';
  RAISE NOTICE '================';
  RAISE NOTICE 'Added updated_at and approved_at columns';
  RAISE NOTICE 'Created auto-update triggers';
  RAISE NOTICE '';
END $$;