-- URGENT FIX: Enable likes/tees to work immediately
-- Run this NOW in Supabase Dashboard > SQL Editor

-- 1. Fix RLS on feed_likes table (CRITICAL)
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop ALL old policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.feed_likes;
DROP POLICY IF EXISTS "Anyone can view feed likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated users can add likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can remove their likes" ON public.feed_likes;

-- Create NEW working policies
CREATE POLICY "Anyone can view likes" 
ON public.feed_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can like" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 2. Fix the likes_count to match actual likes
UPDATE feed_posts 
SET likes_count = (
  SELECT COUNT(*) 
  FROM feed_likes 
  WHERE feed_likes.post_id = feed_posts.id
);

-- 3. Create trigger to auto-update likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_post_likes_trigger ON public.feed_likes;

-- Create new trigger
CREATE TRIGGER update_post_likes_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- 4. Verify it worked
SELECT 
  'RLS Fixed' as status,
  COUNT(*) as total_likes,
  COUNT(DISTINCT post_id) as posts_with_likes
FROM feed_likes;

-- Show the policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'feed_likes'
ORDER BY cmd;