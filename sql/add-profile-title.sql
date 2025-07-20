-- Add title column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;

-- Add some common default titles for users to choose from
-- This is just for reference, the actual list will be in the frontend
COMMENT ON COLUMN profiles.title IS 'User''s chosen golf title (e.g., Weekend Warrior, Scratch Golfer, etc.)';

-- Set default title for existing users (optional)
-- UPDATE profiles SET title = 'Golfer' WHERE title IS NULL;