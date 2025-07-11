-- Final comprehensive fix for feed system
-- Run this entire script in Supabase SQL editor

-- STEP 1: Ensure content column is JSONB
DO $$ 
BEGIN
  -- Check if content column exists and its type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' 
    AND column_name = 'content'
    AND data_type != 'jsonb'
  ) THEN
    -- Convert to JSONB if it's not already
    EXECUTE 'ALTER TABLE feed_posts ALTER COLUMN content TYPE jsonb USING content::jsonb';
    RAISE NOTICE 'Converted content column to JSONB';
  END IF;
END $$;

-- STEP 2: Add missing columns if they don't exist
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS bag_id uuid REFERENCES user_bags(id) ON DELETE CASCADE;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS parent_post_id uuid REFERENCES feed_posts(id) ON DELETE CASCADE;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

-- STEP 3: Fix the type constraint to include all types
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- Create a more flexible check or remove it entirely for now
-- We'll just ensure type is not null
ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IS NOT NULL AND type != '');

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_id ON feed_posts(bag_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_equipment_id ON feed_posts(equipment_id);

-- STEP 5: Ensure RLS is properly configured
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON feed_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON feed_posts;

-- Create new policies
CREATE POLICY "Public read access" ON feed_posts
FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON feed_posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON feed_posts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON feed_posts
FOR DELETE USING (auth.uid() = user_id);

-- STEP 6: Create or replace the feed_likes table if needed
CREATE TABLE IF NOT EXISTS feed_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on feed_likes
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- Policies for feed_likes
CREATE POLICY "Public read access" ON feed_likes
FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON feed_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON feed_likes
FOR DELETE USING (auth.uid() = user_id);

-- STEP 7: Test by showing current posts
SELECT 
  fp.id,
  fp.type,
  fp.created_at,
  fp.content,
  p.username,
  COUNT(fl.id) as like_count
FROM feed_posts fp
LEFT JOIN profiles p ON p.id = fp.user_id
LEFT JOIN feed_likes fl ON fl.post_id = fp.id
GROUP BY fp.id, fp.type, fp.created_at, fp.content, p.username
ORDER BY fp.created_at DESC;

-- STEP 8: Show final status
DO $$ 
BEGIN
  RAISE NOTICE 'Feed system setup complete!';
  RAISE NOTICE 'Posts should now appear in the feed.';
  RAISE NOTICE 'If you still have issues, check:';
  RAISE NOTICE '1. Browser console for JavaScript errors';
  RAISE NOTICE '2. Network tab for failed API calls';
  RAISE NOTICE '3. Supabase logs for any RLS violations';
END $$;