-- FINAL FIX FOR LIKES/TEES INSERT ISSUE
-- This specifically fixes the INSERT policy that's blocking likes

-- First, ensure RLS is enabled
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
BEGIN
    -- Drop any policy that might exist
    DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
    DROP POLICY IF EXISTS "Authenticated can like" ON public.feed_likes;
    DROP POLICY IF EXISTS "Users can unlike" ON public.feed_likes;
    DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
    DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;
    DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.feed_likes;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.feed_likes;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.feed_likes;
    DROP POLICY IF EXISTS "Anyone can view feed likes" ON public.feed_likes;
    DROP POLICY IF EXISTS "Authenticated users can add likes" ON public.feed_likes;
    DROP POLICY IF EXISTS "Users can remove their likes" ON public.feed_likes;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create simple, working policies
-- 1. Everyone can view likes (needed for counts)
CREATE POLICY "allow_select_all" 
ON public.feed_likes 
FOR SELECT 
TO public 
USING (true);

-- 2. Authenticated users can insert their own likes
CREATE POLICY "allow_insert_own" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. Authenticated users can delete their own likes
CREATE POLICY "allow_delete_own" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
    'Policy Check' as status,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename = 'feed_likes';

-- Test that we have the right columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'feed_likes'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ RLS policies have been reset and should now work!' as message;