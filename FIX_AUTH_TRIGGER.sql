-- ============================================================================
-- FIX AUTH TRIGGER: Ensure profiles are created on signup
-- ============================================================================

BEGIN;

-- 1. Create or replace the function that creates profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Make sure profiles table allows inserts from trigger
GRANT INSERT ON public.profiles TO postgres;
GRANT INSERT ON public.profiles TO service_role;

COMMIT;

-- Verify
SELECT 
    'Auth trigger fixed!' as status,
    COUNT(*) as total_profiles
FROM profiles;