-- ============================================================================
-- FIX RLS POLICIES FOR PUBLIC READ ACCESS - BASED ON ACTUAL SCHEMA
-- ============================================================================
-- This script enables public read access for tables that ACTUALLY EXIST
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable RLS on all EXISTING tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grips ENABLE ROW LEVEL SECURITY;
ALTER TABLE loft_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE (3 records)
-- ============================================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "public_profiles_read" ON profiles;
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_public_read_profiles" ON profiles;

CREATE POLICY "allow_public_read_profiles" ON profiles
  FOR SELECT
  USING (true);

-- ============================================================================
-- EQUIPMENT TABLE (903 records)
-- ============================================================================
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "public_equipment_read" ON equipment;
DROP POLICY IF EXISTS "public_read_equipment" ON equipment;
DROP POLICY IF EXISTS "allow_public_read_equipment" ON equipment;

CREATE POLICY "allow_public_read_equipment" ON equipment
  FOR SELECT
  USING (true);

-- ============================================================================
-- USER_BAGS TABLE (5 records)
-- ============================================================================
DROP POLICY IF EXISTS "Public bags are viewable by everyone" ON user_bags;
DROP POLICY IF EXISTS "public_bags_read" ON user_bags;
DROP POLICY IF EXISTS "public_read_user_bags" ON user_bags;
DROP POLICY IF EXISTS "allow_public_read_bags" ON user_bags;

CREATE POLICY "allow_public_read_bags" ON user_bags
  FOR SELECT
  USING (true);

-- ============================================================================
-- BAG_EQUIPMENT TABLE (34 records)
-- ============================================================================
DROP POLICY IF EXISTS "Bag equipment viewable with bag" ON bag_equipment;
DROP POLICY IF EXISTS "public_bag_equipment_read" ON bag_equipment;
DROP POLICY IF EXISTS "public_read_bag_equipment" ON bag_equipment;
DROP POLICY IF EXISTS "allow_public_read_bag_equipment" ON bag_equipment;

CREATE POLICY "allow_public_read_bag_equipment" ON bag_equipment
  FOR SELECT
  USING (true);

-- ============================================================================
-- EQUIPMENT_PHOTOS TABLE (89 records)
-- ============================================================================
DROP POLICY IF EXISTS "Equipment photos viewable by all" ON equipment_photos;
DROP POLICY IF EXISTS "public_equipment_photos_read" ON equipment_photos;
DROP POLICY IF EXISTS "allow_public_read_equipment_photos" ON equipment_photos;

CREATE POLICY "allow_public_read_equipment_photos" ON equipment_photos
  FOR SELECT
  USING (true);

-- ============================================================================
-- EQUIPMENT_REPORTS TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Equipment reports viewable by all" ON equipment_reports;
DROP POLICY IF EXISTS "allow_public_read_equipment_reports" ON equipment_reports;

CREATE POLICY "allow_public_read_equipment_reports" ON equipment_reports
  FOR SELECT
  USING (true);

-- ============================================================================
-- EQUIPMENT_REVIEWS TABLE (1 record)
-- ============================================================================
DROP POLICY IF EXISTS "Equipment reviews viewable by all" ON equipment_reviews;
DROP POLICY IF EXISTS "public_equipment_reviews_read" ON equipment_reviews;
DROP POLICY IF EXISTS "allow_public_read_equipment_reviews" ON equipment_reviews;

CREATE POLICY "allow_public_read_equipment_reviews" ON equipment_reviews
  FOR SELECT
  USING (true);

-- ============================================================================
-- EQUIPMENT_SAVES TABLE (7 records) - KEEP PRIVATE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment saves viewable by owner" ON equipment_saves;
DROP POLICY IF EXISTS "public_equipment_saves_read" ON equipment_saves;
DROP POLICY IF EXISTS "users_view_own_equipment_saves" ON equipment_saves;

-- This should remain private - only viewable by owner
CREATE POLICY "users_view_own_equipment_saves" ON equipment_saves
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_WISHLIST TABLE (0 records) - KEEP PRIVATE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment wishlist private to user" ON equipment_wishlist;
DROP POLICY IF EXISTS "users_view_own_wishlist" ON equipment_wishlist;

-- This should remain private - only viewable by owner
CREATE POLICY "users_view_own_wishlist" ON equipment_wishlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FEED_POSTS TABLE (66 records)
-- ============================================================================
DROP POLICY IF EXISTS "Feed posts are viewable by everyone" ON feed_posts;
DROP POLICY IF EXISTS "public_feed_posts_read" ON feed_posts;
DROP POLICY IF EXISTS "public_read_feed_posts" ON feed_posts;
DROP POLICY IF EXISTS "allow_public_read_feed_posts" ON feed_posts;

CREATE POLICY "allow_public_read_feed_posts" ON feed_posts
  FOR SELECT
  USING (true);

-- ============================================================================
-- FEED_LIKES TABLE (51 records)
-- ============================================================================
DROP POLICY IF EXISTS "Feed likes viewable by all" ON feed_likes;
DROP POLICY IF EXISTS "public_feed_likes_read" ON feed_likes;
DROP POLICY IF EXISTS "public_read_feed_likes" ON feed_likes;
DROP POLICY IF EXISTS "allow_public_read_feed_likes" ON feed_likes;

CREATE POLICY "allow_public_read_feed_likes" ON feed_likes
  FOR SELECT
  USING (true);

-- ============================================================================
-- FEED_COMMENTS TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Comments viewable by all" ON feed_comments;
DROP POLICY IF EXISTS "public_feed_comments_read" ON feed_comments;
DROP POLICY IF EXISTS "allow_public_read_feed_comments" ON feed_comments;

CREATE POLICY "allow_public_read_feed_comments" ON feed_comments
  FOR SELECT
  USING (true);

-- ============================================================================
-- BAG_LIKES TABLE (2 records)
-- ============================================================================
DROP POLICY IF EXISTS "Bag likes viewable by all" ON bag_likes;
DROP POLICY IF EXISTS "public_bag_likes_read" ON bag_likes;
DROP POLICY IF EXISTS "allow_public_read_bag_likes" ON bag_likes;

CREATE POLICY "allow_public_read_bag_likes" ON bag_likes
  FOR SELECT
  USING (true);

-- ============================================================================
-- BAG_TEES TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Bag tees viewable by all" ON bag_tees;
DROP POLICY IF EXISTS "public_bag_tees_read" ON bag_tees;
DROP POLICY IF EXISTS "allow_public_read_bag_tees" ON bag_tees;

CREATE POLICY "allow_public_read_bag_tees" ON bag_tees
  FOR SELECT
  USING (true);

-- ============================================================================
-- USER_FOLLOWS TABLE (3 records)
-- ============================================================================
DROP POLICY IF EXISTS "User follows viewable by all" ON user_follows;
DROP POLICY IF EXISTS "public_user_follows_read" ON user_follows;
DROP POLICY IF EXISTS "allow_public_read_user_follows" ON user_follows;

CREATE POLICY "allow_public_read_user_follows" ON user_follows
  FOR SELECT
  USING (true);

-- ============================================================================
-- USER_BADGES TABLE (25 records)
-- ============================================================================
DROP POLICY IF EXISTS "User badges viewable by all" ON user_badges;
DROP POLICY IF EXISTS "allow_public_read_user_badges" ON user_badges;

CREATE POLICY "allow_public_read_user_badges" ON user_badges
  FOR SELECT
  USING (true);

-- ============================================================================
-- BADGE_DEFINITIONS TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Badge definitions viewable by all" ON badge_definitions;
DROP POLICY IF EXISTS "allow_public_read_badge_definitions" ON badge_definitions;

CREATE POLICY "allow_public_read_badge_definitions" ON badge_definitions
  FOR SELECT
  USING (true);

-- ============================================================================
-- SHAFTS TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Shafts viewable by all" ON shafts;
DROP POLICY IF EXISTS "allow_public_read_shafts" ON shafts;

CREATE POLICY "allow_public_read_shafts" ON shafts
  FOR SELECT
  USING (true);

-- ============================================================================
-- GRIPS TABLE (0 records)
-- ============================================================================
DROP POLICY IF EXISTS "Grips viewable by all" ON grips;
DROP POLICY IF EXISTS "allow_public_read_grips" ON grips;

CREATE POLICY "allow_public_read_grips" ON grips
  FOR SELECT
  USING (true);

-- ============================================================================
-- LOFT_OPTIONS TABLE (72 records)
-- ============================================================================
DROP POLICY IF EXISTS "Loft options viewable by all" ON loft_options;
DROP POLICY IF EXISTS "allow_public_read_loft_options" ON loft_options;

CREATE POLICY "allow_public_read_loft_options" ON loft_options
  FOR SELECT
  USING (true);

-- ============================================================================
-- FORUM_CATEGORIES TABLE (4 records)
-- ============================================================================
DROP POLICY IF EXISTS "Forum categories viewable by all" ON forum_categories;
DROP POLICY IF EXISTS "allow_public_read_forum_categories" ON forum_categories;

CREATE POLICY "allow_public_read_forum_categories" ON forum_categories
  FOR SELECT
  USING (true);

-- ============================================================================
-- FORUM_THREADS TABLE (2 records)
-- ============================================================================
DROP POLICY IF EXISTS "Forum threads viewable by all" ON forum_threads;
DROP POLICY IF EXISTS "allow_public_read_forum_threads" ON forum_threads;

CREATE POLICY "allow_public_read_forum_threads" ON forum_threads
  FOR SELECT
  USING (true);

-- ============================================================================
-- FORUM_POSTS TABLE (14 records)
-- ============================================================================
DROP POLICY IF EXISTS "Forum posts viewable by all" ON forum_posts;
DROP POLICY IF EXISTS "allow_public_read_forum_posts" ON forum_posts;

CREATE POLICY "allow_public_read_forum_posts" ON forum_posts
  FOR SELECT
  USING (true);

-- ============================================================================
-- FORUM_REACTIONS TABLE (20 records)
-- ============================================================================
DROP POLICY IF EXISTS "Forum reactions viewable by all" ON forum_reactions;
DROP POLICY IF EXISTS "allow_public_read_forum_reactions" ON forum_reactions;

CREATE POLICY "allow_public_read_forum_reactions" ON forum_reactions
  FOR SELECT
  USING (true);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- This will show all policies after applying the changes
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'SELECT'
ORDER BY tablename, policyname;