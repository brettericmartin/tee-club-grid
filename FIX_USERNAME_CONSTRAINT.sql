-- ============================================================================
-- FIX: Remove NOT NULL constraint on username
-- ============================================================================
-- This is what's breaking auth signup!
-- ============================================================================

BEGIN;

-- 1. Make username nullable (this is the fix!)
ALTER TABLE profiles 
  ALTER COLUMN username DROP NOT NULL;

-- 2. Update the trigger to generate a username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,  -- Generate a random username
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    -- Generate username from email + random number
    LOWER(REGEXP_REPLACE(SPLIT_PART(new.email, '@', 1), '[^a-z0-9]', '', 'g')) || floor(random() * 10000)::text,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- Test that it worked
SELECT 
  'Username constraint fixed!' as status,
  COUNT(*) as total_profiles
FROM profiles;