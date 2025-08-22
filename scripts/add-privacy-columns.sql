-- ============================================================================
-- ADD PRIVACY COLUMNS TO ENABLE PRIVATE BAGS
-- ============================================================================
-- Optional: Run this if you want to add privacy features
-- ============================================================================

-- Add is_public column to user_bags (default to true for existing bags)
ALTER TABLE user_bags 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Set all existing bags to public (preserves current behavior)
UPDATE user_bags 
SET is_public = true 
WHERE is_public IS NULL;

-- Make it non-nullable after setting defaults
ALTER TABLE user_bags 
ALTER COLUMN is_public SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_bags_is_public 
ON user_bags(is_public) 
WHERE is_public = true;

-- Add comment for documentation
COMMENT ON COLUMN user_bags.is_public IS 'Whether this bag is publicly visible. Private bags are only visible to the owner.';

-- ============================================================================
-- OPTIONAL: Add privacy to profiles table
-- ============================================================================

-- Add profile privacy setting
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' 
CHECK (profile_visibility IN ('public', 'friends', 'private'));

-- Add index for profile visibility
CREATE INDEX IF NOT EXISTS idx_profiles_visibility 
ON profiles(profile_visibility) 
WHERE profile_visibility = 'public';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_bags' 
    AND column_name = 'is_public'
  ) THEN
    RAISE NOTICE '✅ Privacy column successfully added to user_bags';
  ELSE
    RAISE WARNING '❌ Failed to add privacy column to user_bags';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Update your application to set is_public when creating bags';
  RAISE NOTICE '   2. Add UI toggle for users to change bag privacy';
  RAISE NOTICE '   3. Run privacy-aware RLS script: scripts/privacy-aware-affiliate-rls.sql';
END $$;