-- Fix Google OAuth profile creation trigger
-- This resolves "Database error saving new user" when signing in with Google

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved function that handles OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_username TEXT;
  username_exists BOOLEAN;
  counter INTEGER := 0;
  final_username TEXT;
BEGIN
  -- Generate a default username from email or provider data
  default_username := COALESCE(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'preferred_username', 
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  -- Clean up the username (remove spaces, special chars)
  default_username := regexp_replace(lower(default_username), '[^a-z0-9_]', '', 'g');
  
  -- If username is empty after cleaning, use email prefix
  IF default_username = '' OR default_username IS NULL THEN
    default_username := split_part(new.email, '@', 1);
    default_username := regexp_replace(lower(default_username), '[^a-z0-9_]', '', 'g');
  END IF;
  
  -- Ensure username is not too short
  IF length(default_username) < 3 THEN
    default_username := 'user' || substring(new.id::text, 1, 8);
  END IF;
  
  -- Check if username exists and append number if needed
  final_username := default_username;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE username = final_username
    ) INTO username_exists;
    
    EXIT WHEN NOT username_exists;
    
    counter := counter + 1;
    final_username := default_username || counter;
  END LOOP;
  
  -- Insert the profile with the unique username
  INSERT INTO public.profiles (id, username, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If there's still a unique violation, generate a random username
    INSERT INTO public.profiles (id, username, created_at, updated_at)
    VALUES (
      new.id,
      'user_' || substring(new.id::text, 1, 12),
      now(),
      now()
    );
    RETURN new;
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;