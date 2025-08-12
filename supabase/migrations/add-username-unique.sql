-- Add unique constraint to username field in profiles table
-- This ensures each username is unique across the platform

-- First, update any duplicate usernames to make them unique
WITH duplicates AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at) as rn
  FROM profiles
  WHERE username IS NOT NULL
)
UPDATE profiles
SET username = username || '_' || duplicates.rn
FROM duplicates
WHERE profiles.id = duplicates.id AND duplicates.rn > 1;

-- Create a unique index on lowercase username to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- Add a check constraint to ensure usernames follow valid pattern
-- (alphanumeric, dots, underscores, hyphens, minimum 3 chars)
ALTER TABLE profiles
ADD CONSTRAINT username_format_check 
CHECK (
  username IS NULL OR 
  (LENGTH(username) >= 3 AND username ~ '^[a-zA-Z0-9._-]+$')
);

-- Create a function to validate username availability
CREATE OR REPLACE FUNCTION check_username_availability(input_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(input_username)
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the constraint
COMMENT ON CONSTRAINT profiles_username_unique ON profiles IS 
'Ensures usernames are unique across the platform (case-insensitive)';