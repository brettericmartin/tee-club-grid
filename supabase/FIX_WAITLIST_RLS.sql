-- Fix RLS policies for waitlist table
-- The issue is that INSERT needs to be TO public (not anon)

-- First, drop the existing policy
DROP POLICY IF EXISTS "Anonymous users can add to waitlist" ON public.waitlist;

-- Create the correct policy for anonymous inserts
-- The key is using 'public' role instead of 'anon'
CREATE POLICY "Public can insert to waitlist"
ON public.waitlist
FOR INSERT
TO public
WITH CHECK (email IS NOT NULL);

-- Also ensure anon role can insert (belt and suspenders approach)
CREATE POLICY "Anyone can add to waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Grant explicit INSERT permission to anon
GRANT INSERT ON public.waitlist TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Verify the table is accessible
GRANT SELECT ON public.waitlist TO anon;