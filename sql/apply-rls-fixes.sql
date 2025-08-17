-- CRITICAL RLS FIXES FOR TEED.CLUB
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Enable RLS on critical tables
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- 2. Fix feed_likes policies (CRITICAL - blocking like functionality)
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can select feed likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can insert their own feed likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can delete their own feed likes" ON public.feed_likes;

CREATE POLICY "feed_likes_select_policy" 
ON public.feed_likes 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "feed_likes_insert_policy" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_likes_delete_policy" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 3. Fix user_follows policies (CRITICAL - blocking follow functionality)
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
DROP POLICY IF EXISTS "Users can select follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.user_follows;

CREATE POLICY "user_follows_select_policy" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "user_follows_insert_policy" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_follows_delete_policy" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- 4. Fix forum_reactions policies (if table exists)
DROP POLICY IF EXISTS "forum_reactions_select_policy" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_insert_policy" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_delete_policy" ON public.forum_reactions;

CREATE POLICY "forum_reactions_select_policy" 
ON public.forum_reactions 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "forum_reactions_insert_policy" 
ON public.forum_reactions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_reactions_delete_policy" 
ON public.forum_reactions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. Verify policies are applied
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'user_follows', 'forum_reactions')
ORDER BY tablename, cmd;