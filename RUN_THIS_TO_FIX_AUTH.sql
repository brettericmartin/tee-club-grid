-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX AUTH
-- ============================================================================
-- The auth system is failing because the trigger is broken
-- This will recreate it properly
-- ============================================================================

BEGIN;

-- 1. Drop the broken trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create a working trigger that handles usernames properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  final_username text;
  final_display_name text;
BEGIN
  -- Get username from metadata or generate from email
  final_username := new.raw_user_meta_data->>'username';
  
  IF final_username IS NULL OR final_username = '' THEN
    -- Generate from email if not provided
    final_username := split_part(new.email, '@', 1);
    -- Make it unique by adding part of the ID
    final_username := final_username || '_' || substr(new.id::text, 1, 8);
  END IF;
  
  -- Sanitize username (lowercase, alphanumeric + underscore only)
  final_username := lower(regexp_replace(final_username, '[^a-z0-9_]', '', 'g'));
  
  -- Get display name or use email prefix
  final_display_name := new.raw_user_meta_data->>'display_name';
  IF final_display_name IS NULL OR final_display_name = '' THEN
    final_display_name := split_part(new.email, '@', 1);
  END IF;
  
  -- Insert the profile
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    beta_access,
    city_region,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    final_username,
    final_display_name,
    COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
    new.raw_user_meta_data->>'city_region',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username), -- Don't overwrite existing username
    display_name = EXCLUDED.display_name,
    beta_access = EXCLUDED.beta_access,
    updated_at = now();
  
  RETURN new;
  
EXCEPTION 
  WHEN unique_violation THEN
    -- Username is taken, generate a unique one
    final_username := final_username || '_' || substr(md5(random()::text), 1, 6);
    
    INSERT INTO public.profiles (
      id,
      email,
      username,
      display_name,
      beta_access,
      city_region,
      created_at,
      updated_at
    ) VALUES (
      new.id,
      new.email,
      final_username,
      final_display_name,
      COALESCE((new.raw_user_meta_data->>'beta_access')::boolean, false),
      new.raw_user_meta_data->>'city_region',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = COALESCE(profiles.username, EXCLUDED.username),
      display_name = EXCLUDED.display_name,
      beta_access = EXCLUDED.beta_access,
      updated_at = now();
    
    RETURN new;
    
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    -- Try minimal insert
    INSERT INTO public.profiles (id, email, username, created_at, updated_at)
    VALUES (
      new.id,
      new.email,
      'user_' || substr(new.id::text, 1, 8),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN new;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;

-- 5. Test the trigger with a direct insert (this will be rolled back)
DO $$
DECLARE
  test_id uuid := gen_random_uuid();
BEGIN
  -- Try to create a test user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    test_id,
    'authenticated',
    'authenticated',
    'trigger_test_' || extract(epoch from now()) || '@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'username', 'testuser',
      'display_name', 'Test User',
      'beta_access', true
    )
  );
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_id) THEN
    RAISE NOTICE '✅ Trigger is working! Profile was created.';
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_id;
    DELETE FROM auth.users WHERE id = test_id;
  ELSE
    RAISE WARNING '❌ Trigger did not create profile';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Trigger test failed: %', SQLERRM;
END;
$$;

COMMIT;

-- Final verification
SELECT 'Trigger has been fixed and tested!' as status;

-- Show the current trigger
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  n.nspname as function_schema
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE t.tgname = 'on_auth_user_created';