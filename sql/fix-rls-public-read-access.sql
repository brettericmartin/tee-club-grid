-- ============================================================================
-- FIX RLS POLICIES FOR PUBLIC READ ACCESS
-- ============================================================================
-- This script enables public read access for all tables while maintaining
-- write restrictions. Run this in Supabase SQL Editor.
-- ============================================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Drop existing select policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "public_profiles_read" ON profiles;
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;

-- Create new public read policy
CREATE POLICY "allow_public_read_profiles" ON profiles
  FOR SELECT
  USING (true);

-- Keep existing write policies
-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- EQUIPMENT TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "public_equipment_read" ON equipment;
DROP POLICY IF EXISTS "public_read_equipment" ON equipment;

CREATE POLICY "allow_public_read_equipment" ON equipment
  FOR SELECT
  USING (true);

-- Authenticated users can add equipment
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON equipment;
CREATE POLICY "auth_users_insert_equipment" ON equipment
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- USER_BAGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Public bags are viewable by everyone" ON user_bags;
DROP POLICY IF EXISTS "public_bags_read" ON user_bags;
DROP POLICY IF EXISTS "public_read_user_bags" ON user_bags;

CREATE POLICY "allow_public_read_bags" ON user_bags
  FOR SELECT
  USING (true);

-- Users can manage their own bags
DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags;
CREATE POLICY "users_manage_own_bags" ON user_bags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BAG_EQUIPMENT TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Bag equipment viewable with bag" ON bag_equipment;
DROP POLICY IF EXISTS "public_bag_equipment_read" ON bag_equipment;
DROP POLICY IF EXISTS "public_read_bag_equipment" ON bag_equipment;

CREATE POLICY "allow_public_read_bag_equipment" ON bag_equipment
  FOR SELECT
  USING (true);

-- Users can manage equipment in their own bags
DROP POLICY IF EXISTS "Users manage own bag equipment" ON bag_equipment;
CREATE POLICY "users_manage_own_bag_equipment" ON bag_equipment
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FEED_POSTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Feed posts are viewable by everyone" ON feed_posts;
DROP POLICY IF EXISTS "public_feed_posts_read" ON feed_posts;
DROP POLICY IF EXISTS "public_read_feed_posts" ON feed_posts;

CREATE POLICY "allow_public_read_feed_posts" ON feed_posts
  FOR SELECT
  USING (true);

-- Users can manage their own posts
DROP POLICY IF EXISTS "Users manage own feed posts" ON feed_posts;
CREATE POLICY "users_manage_own_feed_posts" ON feed_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FEED_LIKES TABLE (Tees)
-- ============================================================================
DROP POLICY IF EXISTS "Feed likes viewable by all" ON feed_likes;
DROP POLICY IF EXISTS "public_feed_likes_read" ON feed_likes;
DROP POLICY IF EXISTS "public_read_feed_likes" ON feed_likes;

CREATE POLICY "allow_public_read_feed_likes" ON feed_likes
  FOR SELECT
  USING (true);

-- Users can manage their own likes
DROP POLICY IF EXISTS "Users manage own feed likes" ON feed_likes;
CREATE POLICY "users_manage_own_feed_likes" ON feed_likes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FEED_COMMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Comments viewable by all" ON feed_comments;
DROP POLICY IF EXISTS "public_feed_comments_read" ON feed_comments;

CREATE POLICY "allow_public_read_feed_comments" ON feed_comments
  FOR SELECT
  USING (true);

-- Users can manage their own comments
DROP POLICY IF EXISTS "Users manage own comments" ON feed_comments;
CREATE POLICY "users_manage_own_comments" ON feed_comments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BAG_LIKES/BAG_TEES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Bag likes viewable by all" ON bag_likes;
DROP POLICY IF EXISTS "public_bag_likes_read" ON bag_likes;

CREATE POLICY "allow_public_read_bag_likes" ON bag_likes
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_bag_likes" ON bag_likes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Bag tees viewable by all" ON bag_tees;
DROP POLICY IF EXISTS "public_bag_tees_read" ON bag_tees;

CREATE POLICY "allow_public_read_bag_tees" ON bag_tees
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_bag_tees" ON bag_tees
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_TEES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment tees viewable by all" ON equipment_tees;
DROP POLICY IF EXISTS "public_equipment_tees_read" ON equipment_tees;

CREATE POLICY "allow_public_read_equipment_tees" ON equipment_tees
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_equipment_tees" ON equipment_tees
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_SAVES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment saves viewable by owner" ON equipment_saves;
DROP POLICY IF EXISTS "public_equipment_saves_read" ON equipment_saves;

-- Equipment saves should be private to the user
CREATE POLICY "users_view_own_equipment_saves" ON equipment_saves
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_equipment_saves" ON equipment_saves
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_PHOTOS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment photos viewable by all" ON equipment_photos;
DROP POLICY IF EXISTS "public_equipment_photos_read" ON equipment_photos;

CREATE POLICY "allow_public_read_equipment_photos" ON equipment_photos
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_equipment_photos" ON equipment_photos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_REVIEWS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment reviews viewable by all" ON equipment_reviews;
DROP POLICY IF EXISTS "public_equipment_reviews_read" ON equipment_reviews;

CREATE POLICY "allow_public_read_equipment_reviews" ON equipment_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_equipment_reviews" ON equipment_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_WISHLIST TABLE
-- ============================================================================
-- Wishlist should be private to the user
DROP POLICY IF EXISTS "Equipment wishlist private to user" ON equipment_wishlist;

CREATE POLICY "users_view_own_wishlist" ON equipment_wishlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_wishlist" ON equipment_wishlist
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EQUIPMENT_PRICES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Equipment prices viewable by all" ON equipment_prices;

CREATE POLICY "allow_public_read_equipment_prices" ON equipment_prices
  FOR SELECT
  USING (true);

-- ============================================================================
-- USER_FOLLOWS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "User follows viewable by all" ON user_follows;
DROP POLICY IF EXISTS "public_user_follows_read" ON user_follows;

CREATE POLICY "allow_public_read_user_follows" ON user_follows
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_follows" ON user_follows
  FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- ============================================================================
-- FORUM TABLES
-- ============================================================================
DROP POLICY IF EXISTS "Forum categories viewable by all" ON forum_categories;
CREATE POLICY "allow_public_read_forum_categories" ON forum_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Forum threads viewable by all" ON forum_threads;
CREATE POLICY "allow_public_read_forum_threads" ON forum_threads
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Forum posts viewable by all" ON forum_posts;
CREATE POLICY "allow_public_read_forum_posts" ON forum_posts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Forum reactions viewable by all" ON forum_reactions;
CREATE POLICY "allow_public_read_forum_reactions" ON forum_reactions
  FOR SELECT
  USING (true);

-- Users can create and manage their own forum content
CREATE POLICY "users_create_forum_threads" ON forum_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_forum_threads" ON forum_threads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_forum_posts" ON forum_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_forum_reactions" ON forum_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BADGES TABLES
-- ============================================================================
DROP POLICY IF EXISTS "Badges viewable by all" ON badges;
CREATE POLICY "allow_public_read_badges" ON badges
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "User badges viewable by all" ON user_badges;
CREATE POLICY "allow_public_read_user_badges" ON user_badges
  FOR SELECT
  USING (true);

-- ============================================================================
-- SAVED_PHOTOS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Saved photos viewable by all" ON saved_photos;
CREATE POLICY "allow_public_read_saved_photos" ON saved_photos
  FOR SELECT
  USING (true);

CREATE POLICY "users_manage_own_saved_photos" ON saved_photos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================
-- This query will show all policies after the changes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;