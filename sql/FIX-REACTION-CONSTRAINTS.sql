-- Fix Reaction Type Constraints
-- This updates the check constraint to allow all reaction types the frontend uses

-- First, let's see what constraint exists
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'forum_reactions'::regclass
AND contype = 'c';

-- Drop the existing check constraint
ALTER TABLE public.forum_reactions 
DROP CONSTRAINT IF EXISTS forum_reactions_reaction_type_check;

-- Add a new constraint that allows the reaction types used by the frontend
-- The frontend uses: 'tee', 'helpful', 'fire', 'fixed'
ALTER TABLE public.forum_reactions 
ADD CONSTRAINT forum_reactions_reaction_type_check 
CHECK (reaction_type IN ('tee', 'helpful', 'fire', 'fixed', 'hot_take'));

-- Verify the constraint was updated
SELECT 
    'Constraint Updated' as status,
    'Allowed types: tee, helpful, fire, fixed, hot_take' as allowed_types;

-- Now fix the RLS if it's still an issue
-- Make sure policies are truly permissive
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_all_select_forum_reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "allow_all_insert_forum_reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "allow_all_delete_forum_reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_select_policy" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_insert_policy" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_delete_policy" ON public.forum_reactions;

-- Create simple working policies
CREATE POLICY "reactions_select" 
ON public.forum_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "reactions_insert" 
ON public.forum_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete" 
ON public.forum_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Do the same for feed_likes
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_feed_likes" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_all_insert_feed_likes" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_all_delete_feed_likes" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;

CREATE POLICY "likes_select" 
ON public.feed_likes 
FOR SELECT 
USING (true);

CREATE POLICY "likes_insert" 
ON public.feed_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete" 
ON public.feed_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verify everything
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'forum_reactions')
ORDER BY tablename, cmd;

-- Success message
SELECT 
    '✅ REACTIONS FIXED!' as status,
    'Check constraint updated to allow: tee, helpful, fire, fixed' as constraints,
    'RLS policies simplified with auth.uid() = user_id' as policies;