-- Fix RLS policies for feed_posts table
-- This ensures users can see all posts, not just their own

-- First, check existing policies
DO $$
BEGIN
  -- Drop existing view policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feed_posts' 
    AND policyname = 'Users can view all posts'
  ) THEN
    DROP POLICY "Users can view all posts" ON feed_posts;
  END IF;
END $$;

-- Create new policy that allows viewing all posts
CREATE POLICY "Users can view all posts" 
ON feed_posts 
FOR SELECT 
USING (true);  -- This allows everyone to see all posts

-- Ensure other policies are correct
-- Users can only create their own posts
DROP POLICY IF EXISTS "Users can create their own posts" ON feed_posts;
CREATE POLICY "Users can create their own posts" 
ON feed_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON feed_posts;
CREATE POLICY "Users can update their own posts" 
ON feed_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON feed_posts;
CREATE POLICY "Users can delete their own posts" 
ON feed_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Also check that equipment_id and media_urls columns exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feed_posts' 
AND column_name IN ('equipment_id', 'media_urls');