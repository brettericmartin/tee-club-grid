-- Fix display_name constraint issue for profiles table
-- This allows display_name to be NULL and sets a default value

-- First, check if display_name column exists and its current constraints
DO $$
BEGIN
  -- Check if display_name column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    -- Make display_name nullable if it's NOT NULL
    ALTER TABLE profiles 
    ALTER COLUMN display_name DROP NOT NULL;
    
    -- Set a default value (empty string) for new rows
    ALTER TABLE profiles 
    ALTER COLUMN display_name SET DEFAULT '';
    
    -- Update any existing NULL display_names to use username as fallback
    UPDATE profiles 
    SET display_name = COALESCE(display_name, username, 'User')
    WHERE display_name IS NULL OR display_name = '';
    
    RAISE NOTICE 'Fixed display_name column constraints';
  ELSE
    -- Add display_name column if it doesn't exist
    ALTER TABLE profiles 
    ADD COLUMN display_name TEXT DEFAULT '';
    
    -- Set initial values from username
    UPDATE profiles 
    SET display_name = COALESCE(username, 'User')
    WHERE display_name IS NULL OR display_name = '';
    
    RAISE NOTICE 'Added display_name column with defaults';
  END IF;
END $$;

-- Also ensure the profiles table has proper constraints for username
-- Username should remain NOT NULL and UNIQUE
DO $$
BEGIN
  -- Check if username has the proper constraints
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%username%'
  ) THEN
    -- Add unique constraint if missing
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_username_unique UNIQUE (username);
    
    RAISE NOTICE 'Added unique constraint to username';
  END IF;
END $$;

-- Create or update the profile update trigger to handle display_name
CREATE OR REPLACE FUNCTION update_profile_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If display_name is being set to NULL or empty, use username as fallback
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := COALESCE(NEW.username, OLD.username, 'User');
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_profile_display_name ON profiles;

-- Create trigger to ensure display_name is never completely empty
CREATE TRIGGER ensure_profile_display_name
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_display_name();

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('username', 'display_name');