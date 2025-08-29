-- ============================================================================
-- EMERGENCY FIX: Recreate the trigger from scratch
-- ============================================================================

-- First check what's there
SELECT 'Checking existing trigger...' as status;
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a SIMPLE working trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just insert with the data we have
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    beta_access
  ) VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8)
    ),
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      (new.raw_user_meta_data->>'beta_access')::boolean,
      false
    )
  );
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail user creation
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;

-- Verify it was created
SELECT 'Trigger recreated!' as status;
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';