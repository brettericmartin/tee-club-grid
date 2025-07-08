-- Add background_image column to user_bags if it doesn't exist

-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_bags' 
  AND column_name = 'background_image';

-- Add column if it doesn't exist (uncomment to run)
ALTER TABLE user_bags 
ADD COLUMN IF NOT EXISTS background_image text;

-- Add description column too if missing
ALTER TABLE user_bags 
ADD COLUMN IF NOT EXISTS description text;