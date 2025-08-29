-- ============================================================================
-- FIX AUTH SETTINGS: Disable email confirmation requirement
-- ============================================================================
-- Run this to allow signups without email confirmation
-- ============================================================================

-- Update auth config to not require email confirmation
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_email_confirmation = false,
  enable_email_change_confirmation = false
WHERE id = 1;

-- Make sure the trigger exists and works
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    COALESCE(new.email, new.raw_user_meta_data->>'email'),
    now(),
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
GRANT ALL ON auth.config TO postgres, service_role;

-- Check current settings
SELECT 
  'Auth settings status:' as info,
  enable_signup,
  enable_email_confirmation,
  enable_email_change_confirmation
FROM auth.config;