-- ============================================================================
-- FIX: Update trigger to use username from signup
-- ============================================================================

BEGIN;

-- Update the trigger to use the username provided during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    beta_access,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    -- Get username from user metadata (passed during signup)
    COALESCE(new.raw_user_meta_data->>'username', LOWER(SPLIT_PART(new.email, '@', 1))),
    COALESCE(new.raw_user_meta_data->>'display_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    beta_access = COALESCE(EXCLUDED.beta_access, profiles.beta_access),
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
SELECT 
  'Trigger updated to handle username!' as status;