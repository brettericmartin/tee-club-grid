-- Fix Forum RLS Policies to allow public read access
-- This ensures forum threads, posts, and categories are visible to all users

-- Enable RLS on forum tables if not already enabled
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Forum threads are viewable by everyone" ON forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON forum_threads;
DROP POLICY IF EXISTS "Users can delete their own threads" ON forum_threads;

DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON forum_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON forum_posts;

DROP POLICY IF EXISTS "Forum categories are viewable by everyone" ON forum_categories;

-- Forum Threads Policies
CREATE POLICY "Forum threads are viewable by everyone" 
ON forum_threads FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create threads" 
ON forum_threads FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own threads" 
ON forum_threads FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads" 
ON forum_threads FOR DELETE 
USING (auth.uid() = user_id);

-- Forum Posts Policies
CREATE POLICY "Forum posts are viewable by everyone" 
ON forum_posts FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON forum_posts FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own posts" 
ON forum_posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON forum_posts FOR DELETE 
USING (auth.uid() = user_id);

-- Forum Categories Policies
CREATE POLICY "Forum categories are viewable by everyone" 
ON forum_categories FOR SELECT 
USING (true);

-- Only admins can manage categories (you'll need to create an admin check function)
-- For now, categories are read-only from the application