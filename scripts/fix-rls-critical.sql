-- =========================================================
-- CRITICAL RLS FIXES FOR TEED.CLUB SECURITY
-- This fixes the most urgent RLS issues for feed_likes and user_follows
-- Run this in Supabase Dashboard > SQL Editor or via psql
-- =========================================================

-- =========================================
-- 1. FIX FEED_LIKES (Feed Post Tees/Likes)
-- =========================================

-- Enable RLS
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_select_all" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_insert_own" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_delete_own" ON public.feed_likes;

-- Create new policies with authentication requirements
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

-- =========================================
-- 2. FIX USER_FOLLOWS (Follow System)
-- =========================================

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_follows;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_follows;

-- Create new policies with proper authentication
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

-- =========================================
-- 3. VERIFY POLICIES WERE CREATED
-- =========================================

SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'user_follows')
ORDER BY tablename, cmd, policyname;

-- Success message
SELECT 
    '✅ CRITICAL RLS POLICIES APPLIED!' as status,
    'feed_likes: Protected' as feed_likes_status,
    'user_follows: Protected' as user_follows_status,
    'Users can only modify their own data' as security_note;