-- EMERGENCY: Disable RLS to fix infinite recursion
-- Run this FIRST in Supabase SQL Editor to get app working

-- Simply disable RLS on all affected tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts', 'user_bags', 'bag_equipment');
