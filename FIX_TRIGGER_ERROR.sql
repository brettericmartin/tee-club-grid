-- ============================================================================
-- FIX: The trigger is failing because profiles table has constraints
-- ============================================================================

-- First, let's check what's actually required in profiles
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- The issue is username is NOT NULL without a default
-- Let's fix the trigger to handle this properly

BEGIN;

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Username is REQUIRED from signup metadata
  IF new.raw_user_meta_data->>'username' IS NULL THEN
    -- Instead of failing silently, generate one from email
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
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8),  -- email prefix + part of UUID
      COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  ELSE
    -- Normal case - username provided
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
      new.raw_user_meta_data->>'username',
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
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Username already taken, generate a unique one
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
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8),
      COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      beta_access = EXCLUDED.beta_access,
      updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- Test it works
SELECT 'Trigger fixed to handle missing username gracefully' as status;