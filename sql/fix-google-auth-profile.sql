-- Fix Google Authentication Profile Issues
-- This migration ensures Google users have proper profiles and preserves user preferences

-- 1. Add a column to track if avatar is from Google or user-uploaded
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_source text DEFAULT 'user' CHECK (avatar_source IN ('google', 'user', 'default'));

-- 2. Add column to store the original Google avatar URL separately
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_avatar_url text;

-- 3. Update existing Google users to preserve their avatar choices
UPDATE profiles
SET 
  google_avatar_url = avatar_url,
  avatar_source = 'google'
WHERE avatar_url LIKE '%googleusercontent%' 
  AND google_avatar_url IS NULL;

-- 4. Create or replace the profile creation trigger for new Google users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    google_avatar_url,
    avatar_source,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    -- Try to get username from metadata or email
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    -- Try to get display name from metadata
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    -- Set avatar URL
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    -- Store Google avatar separately if it's from Google
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN
        COALESCE(
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'picture'
        )
      ELSE NULL
    END,
    -- Mark avatar source
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'default'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Only update if the profile doesn't have custom data
    display_name = CASE 
      WHEN profiles.avatar_source = 'user' THEN profiles.display_name
      ELSE EXCLUDED.display_name
    END,
    google_avatar_url = EXCLUDED.google_avatar_url,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Add RLS policy for the new columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can update their own avatar_source
CREATE POLICY "Users can update own avatar source" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Add comment to explain the columns
COMMENT ON COLUMN profiles.avatar_source IS 'Tracks whether avatar is from Google OAuth, user uploaded, or default';
COMMENT ON COLUMN profiles.google_avatar_url IS 'Stores the original Google profile picture URL';

-- 8. Create a function to allow users to switch between Google and custom avatars
CREATE OR REPLACE FUNCTION switch_avatar_source(use_google boolean)
RETURNS void AS $$
BEGIN
  IF use_google THEN
    UPDATE profiles
    SET 
      avatar_url = google_avatar_url,
      avatar_source = 'google',
      updated_at = NOW()
    WHERE id = auth.uid() 
      AND google_avatar_url IS NOT NULL;
  ELSE
    UPDATE profiles
    SET 
      avatar_source = 'user',
      updated_at = NOW()
    WHERE id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION switch_avatar_source(boolean) TO authenticated;