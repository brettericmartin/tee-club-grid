-- URGENT: Run this SQL in your Supabase SQL Editor to fix feed likes
-- This will enable the tee/like functionality to work properly

-- 1. First check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'feed_likes';

-- 2. Enable RLS on feed_likes table (if not already enabled)
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can insert their own feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can delete their own feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Enable read access for all users" ON feed_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON feed_likes;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON feed_likes;

-- 4. Create new policies with proper permissions

-- Allow anyone (including anonymous) to read all likes for counting
CREATE POLICY "Enable read access for all users" 
ON feed_likes FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Enable insert for authenticated users only" 
ON feed_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own likes
CREATE POLICY "Enable delete for users based on user_id" 
ON feed_likes FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feed_likes_post_id ON feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user_id ON feed_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user_post ON feed_likes(user_id, post_id);

-- 6. Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'feed_likes';

-- 7. Test query to verify everything is working
SELECT COUNT(*) as total_likes FROM feed_likes;

-- If you see any errors, please share them so we can fix the issue!