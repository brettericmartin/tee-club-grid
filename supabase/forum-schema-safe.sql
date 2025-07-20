-- ================================================
-- FORUM SCHEMA SQL (SAFE VERSION)
-- Run this in your Supabase SQL editor
-- This version checks for existing objects before creating
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create forum_categories table
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create forum_threads table
CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create forum_reactions table
CREATE TABLE IF NOT EXISTS forum_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('tee', 'helpful', 'fire')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- Create forum_subscriptions table
CREATE TABLE IF NOT EXISTS forum_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, thread_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_categories_sort_order ON forum_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user_id ON forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at ON forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_updated_at ON forum_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_is_pinned ON forum_threads(is_pinned);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id ON forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post_id ON forum_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_id ON forum_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_user_id ON forum_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_thread_id ON forum_subscriptions(thread_id);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_forum_threads_updated_at ON forum_threads;

-- Create trigger for updated_at
CREATE TRIGGER update_forum_threads_updated_at BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all forum tables
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Forum categories are viewable by everyone" ON forum_categories;
DROP POLICY IF EXISTS "Forum threads are viewable by everyone" ON forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON forum_threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON forum_threads;
DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON forum_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;
DROP POLICY IF EXISTS "Forum reactions are viewable by everyone" ON forum_reactions;
DROP POLICY IF EXISTS "Authenticated users can create reactions" ON forum_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON forum_reactions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON forum_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON forum_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON forum_subscriptions;

-- Forum categories policies (public read)
CREATE POLICY "Forum categories are viewable by everyone" ON forum_categories
  FOR SELECT USING (true);

-- Forum threads policies
CREATE POLICY "Forum threads are viewable by everyone" ON forum_threads
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON forum_threads
  FOR UPDATE USING (auth.uid() = user_id AND is_locked = false);

CREATE POLICY "Users can delete own threads" ON forum_threads
  FOR DELETE USING (auth.uid() = user_id AND is_locked = false);

-- Forum posts policies
CREATE POLICY "Forum posts are viewable by everyone" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM forum_threads 
      WHERE id = thread_id AND is_locked = false
    )
  );

CREATE POLICY "Users can update own posts" ON forum_posts
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM forum_threads 
      WHERE id = thread_id AND is_locked = false
    )
  );

CREATE POLICY "Users can delete own posts" ON forum_posts
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM forum_threads 
      WHERE id = thread_id AND is_locked = false
    )
  );

-- Forum reactions policies
CREATE POLICY "Forum reactions are viewable by everyone" ON forum_reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reactions" ON forum_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON forum_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Forum subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON forum_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON forum_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON forum_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Seed initial categories (with conflict handling)
INSERT INTO forum_categories (name, slug, description, icon, sort_order) VALUES
  ('Equipment Discussions', 'equipment-discussions', 'Talk about clubs, balls, bags, and all golf equipment', '🏌️', 1),
  ('Brand Talk', 'brand-talk', 'Discussions about specific golf brands and their products', '🏷️', 2),
  ('Golf Tips', 'golf-tips', 'Share and discuss golf tips, techniques, and strategies', '💡', 3),
  ('Site Feedback', 'site-feedback', 'Suggestions, bug reports, and feedback about Teed.club', '💬', 4)
ON CONFLICT (slug) DO NOTHING;