-- ============================================================================
-- FIX RLS POLICIES FOR PUBLIC READ ACCESS - VERIFIED TABLES ONLY
-- ============================================================================
-- This script ONLY includes tables that ACTUALLY EXIST (verified)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable RLS on all VERIFIED EXISTING tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE loft_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ALL EXISTING SELECT POLICIES TO START FRESH
-- ============================================================================
DO $$ 
DECLARE
    pol record;
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'profiles', 'equipment', 'user_bags', 'bag_equipment', 
        'equipment_photos', 'equipment_reviews', 'equipment_saves', 
        'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
        'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
        'user_badges', 'badges', 'loft_options', 'forum_categories',
        'forum_threads', 'forum_posts', 'forum_reactions'
    ])
    LOOP
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = tbl 
            AND cmd = 'SELECT'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- CREATE PUBLIC READ POLICIES FOR ALL TABLES
-- ============================================================================

-- profiles (3 records)
CREATE POLICY "public_read" ON profiles FOR SELECT USING (true);

-- equipment (903 records)
CREATE POLICY "public_read" ON equipment FOR SELECT USING (true);

-- user_bags (5 records)
CREATE POLICY "public_read" ON user_bags FOR SELECT USING (true);

-- bag_equipment (34 records)
CREATE POLICY "public_read" ON bag_equipment FOR SELECT USING (true);

-- equipment_photos (89 records)
CREATE POLICY "public_read" ON equipment_photos FOR SELECT USING (true);

-- equipment_reviews (1 record)
CREATE POLICY "public_read" ON equipment_reviews FOR SELECT USING (true);

-- equipment_saves (7 records) - KEEP PRIVATE
CREATE POLICY "private_to_user" ON equipment_saves 
  FOR SELECT USING (auth.uid() = user_id);

-- equipment_wishlist (0 records) - KEEP PRIVATE
CREATE POLICY "private_to_user" ON equipment_wishlist 
  FOR SELECT USING (auth.uid() = user_id);

-- feed_posts (66 records)
CREATE POLICY "public_read" ON feed_posts FOR SELECT USING (true);

-- feed_likes (51 records)
CREATE POLICY "public_read" ON feed_likes FOR SELECT USING (true);

-- feed_comments (0 records)
CREATE POLICY "public_read" ON feed_comments FOR SELECT USING (true);

-- bag_likes (2 records)
CREATE POLICY "public_read" ON bag_likes FOR SELECT USING (true);

-- bag_tees (0 records)
CREATE POLICY "public_read" ON bag_tees FOR SELECT USING (true);

-- equipment_tees (0 records)
CREATE POLICY "public_read" ON equipment_tees FOR SELECT USING (true);

-- user_follows (3 records)
CREATE POLICY "public_read" ON user_follows FOR SELECT USING (true);

-- user_badges (25 records)
CREATE POLICY "public_read" ON user_badges FOR SELECT USING (true);

-- badges (48 records)
CREATE POLICY "public_read" ON badges FOR SELECT USING (true);

-- loft_options (72 records)
CREATE POLICY "public_read" ON loft_options FOR SELECT USING (true);

-- forum_categories (4 records)
CREATE POLICY "public_read" ON forum_categories FOR SELECT USING (true);

-- forum_threads (2 records)
CREATE POLICY "public_read" ON forum_threads FOR SELECT USING (true);

-- forum_posts (14 records)
CREATE POLICY "public_read" ON forum_posts FOR SELECT USING (true);

-- forum_reactions (20 records)
CREATE POLICY "public_read" ON forum_reactions FOR SELECT USING (true);

-- ============================================================================
-- VERIFY THE POLICIES WERE CREATED
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'equipment', 'user_bags', 'bag_equipment', 
  'equipment_photos', 'equipment_reviews', 'equipment_saves', 
  'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
  'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
  'user_badges', 'badges', 'loft_options', 'forum_categories',
  'forum_threads', 'forum_posts', 'forum_reactions'
)
AND cmd = 'SELECT'
ORDER BY tablename, policyname;