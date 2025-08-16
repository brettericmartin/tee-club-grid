-- Fix RLS policies for user_follows table
-- Run this in Supabase Dashboard > SQL Editor

-- Enable RLS on the table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_follows;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_follows;

-- Create proper policies
-- 1. Anyone can view follows (for displaying follow counts and relationships)
CREATE POLICY "Users can view all follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- 2. Authenticated users can follow others (only as themselves)
CREATE POLICY "Authenticated users can follow" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

-- 3. Authenticated users can unfollow (only their own follows)
CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify the policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies 
WHERE tablename = 'user_follows'
ORDER BY cmd, policyname;