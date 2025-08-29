-- ============================================================================
-- SIMPLE TRIGGER: Just use the username from signup
-- ============================================================================

BEGIN;

-- Simple trigger - username is REQUIRED from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,  -- Required from metadata
    display_name,
    beta_access,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',  -- No fallback, it's required
    new.raw_user_meta_data->>'display_name',
    COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    beta_access = EXCLUDED.beta_access,
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- Verify
SELECT 'Trigger simplified - username is required!' as status;