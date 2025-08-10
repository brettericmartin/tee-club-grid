-- Fix feed_likes table RLS policies

-- 1. Enable RLS on feed_likes table
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can insert their own feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can delete their own feed likes" ON feed_likes;

-- 3. Create new policies

-- Anyone can view all likes (needed for counting)
CREATE POLICY "Users can view all feed likes"
ON feed_likes FOR SELECT
USING (true);

-- Authenticated users can create their own likes
CREATE POLICY "Users can insert their own feed likes"
ON feed_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own feed likes"
ON feed_likes FOR DELETE
USING (auth.uid() = user_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_likes_post_id ON feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user_id ON feed_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user_post ON feed_likes(user_id, post_id);