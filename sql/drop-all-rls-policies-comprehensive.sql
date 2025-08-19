-- ============================================================================
-- COMPREHENSIVE RLS POLICY CLEANUP - ALL POSSIBLE POLICY NAMES
-- ============================================================================
-- This script drops ALL possible RLS policy names found across all SQL files
-- Run this in Supabase SQL Editor to clean up before applying new policies
-- ============================================================================

-- ============================================================================
-- FEED_LIKES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "feed_likes";
DROP POLICY IF EXISTS "Anyone can view feed likes" ON "feed_likes";
DROP POLICY IF EXISTS "Authenticated users can add likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users can remove their likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users can view all likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users can like posts" ON "feed_likes";
DROP POLICY IF EXISTS "Users can unlike posts" ON "feed_likes";
DROP POLICY IF EXISTS "Enable read access for all users" ON "feed_likes";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "feed_likes";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "feed_likes";
DROP POLICY IF EXISTS "feed_likes_select_policy" ON "feed_likes";
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON "feed_likes";
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON "feed_likes";
DROP POLICY IF EXISTS "Users can select feed likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users can insert their own feed likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users can delete their own feed likes" ON "feed_likes";
DROP POLICY IF EXISTS "Anyone can view likes" ON "feed_likes";
DROP POLICY IF EXISTS "Authenticated can like" ON "feed_likes";
DROP POLICY IF EXISTS "Users can unlike" ON "feed_likes";
DROP POLICY IF EXISTS "allow_all_select_feed_likes" ON "feed_likes";
DROP POLICY IF EXISTS "allow_all_insert_feed_likes" ON "feed_likes";
DROP POLICY IF EXISTS "allow_all_delete_feed_likes" ON "feed_likes";
DROP POLICY IF EXISTS "Authenticated users can like" ON "feed_likes";
DROP POLICY IF EXISTS "Users can unlike their own" ON "feed_likes";
DROP POLICY IF EXISTS "Feed likes viewable by all" ON "feed_likes";
DROP POLICY IF EXISTS "public_feed_likes_read" ON "feed_likes";
DROP POLICY IF EXISTS "public_read_feed_likes" ON "feed_likes";
DROP POLICY IF EXISTS "allow_public_read_feed_likes" ON "feed_likes";
DROP POLICY IF EXISTS "Users manage own feed likes" ON "feed_likes";
DROP POLICY IF EXISTS "users_manage_own_feed_likes" ON "feed_likes";

-- ============================================================================
-- FEED_POSTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "feed_posts";
DROP POLICY IF EXISTS "Anyone can view posts" ON "feed_posts";
DROP POLICY IF EXISTS "Users can create posts" ON "feed_posts";
DROP POLICY IF EXISTS "Users can update their posts" ON "feed_posts";
DROP POLICY IF EXISTS "Users can delete their posts" ON "feed_posts";
DROP POLICY IF EXISTS "Feed posts are viewable by everyone" ON "feed_posts";
DROP POLICY IF EXISTS "public_feed_posts_read" ON "feed_posts";
DROP POLICY IF EXISTS "public_read_feed_posts" ON "feed_posts";
DROP POLICY IF EXISTS "allow_public_read_feed_posts" ON "feed_posts";
DROP POLICY IF EXISTS "Users manage own feed posts" ON "feed_posts";
DROP POLICY IF EXISTS "users_manage_own_feed_posts" ON "feed_posts";

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "profiles";
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "profiles";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "profiles";
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON "profiles";
DROP POLICY IF EXISTS "Profiles viewable by all" ON "profiles";
DROP POLICY IF EXISTS "public_profiles_read" ON "profiles";
DROP POLICY IF EXISTS "public_read_profiles" ON "profiles";
DROP POLICY IF EXISTS "allow_public_read_profiles" ON "profiles";
DROP POLICY IF EXISTS "users_update_own_profile" ON "profiles";
DROP POLICY IF EXISTS "Users can insert own profile" ON "profiles";
DROP POLICY IF EXISTS "users_insert_own_profile" ON "profiles";

-- ============================================================================
-- USER_FOLLOWS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "user_follows";
DROP POLICY IF EXISTS "Users can view all follows" ON "user_follows";
DROP POLICY IF EXISTS "Authenticated users can follow" ON "user_follows";
DROP POLICY IF EXISTS "Users can unfollow" ON "user_follows";
DROP POLICY IF EXISTS "Enable read access for all users" ON "user_follows";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "user_follows";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "user_follows";
DROP POLICY IF EXISTS "user_follows_select_policy" ON "user_follows";
DROP POLICY IF EXISTS "user_follows_insert_policy" ON "user_follows";
DROP POLICY IF EXISTS "user_follows_delete_policy" ON "user_follows";
DROP POLICY IF EXISTS "Users can select follows" ON "user_follows";
DROP POLICY IF EXISTS "Users can insert their own follows" ON "user_follows";
DROP POLICY IF EXISTS "Users can delete their own follows" ON "user_follows";
DROP POLICY IF EXISTS "Anyone can view follows" ON "user_follows";
DROP POLICY IF EXISTS "Users can follow others" ON "user_follows";
DROP POLICY IF EXISTS "User follows viewable by all" ON "user_follows";
DROP POLICY IF EXISTS "public_user_follows_read" ON "user_follows";

-- ============================================================================
-- EQUIPMENT POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "equipment";
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON "equipment";
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON "equipment";
DROP POLICY IF EXISTS "Users can update equipment they added" ON "equipment";
DROP POLICY IF EXISTS "public_equipment_read" ON "equipment";
DROP POLICY IF EXISTS "public_read_equipment" ON "equipment";
DROP POLICY IF EXISTS "allow_public_read_equipment" ON "equipment";
DROP POLICY IF EXISTS "auth_users_insert_equipment" ON "equipment";

-- ============================================================================
-- EQUIPMENT_PHOTOS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "equipment_photos";
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON "equipment_photos";
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON "equipment_photos";
DROP POLICY IF EXISTS "Users can manage their photos" ON "equipment_photos";
DROP POLICY IF EXISTS "Users can delete their photos" ON "equipment_photos";
DROP POLICY IF EXISTS "Equipment photos viewable by all" ON "equipment_photos";
DROP POLICY IF EXISTS "public_equipment_photos_read" ON "equipment_photos";

-- ============================================================================
-- USER_BAGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "user_bags";
DROP POLICY IF EXISTS "Bags are viewable by everyone" ON "user_bags";
DROP POLICY IF EXISTS "Users can create their own bags" ON "user_bags";
DROP POLICY IF EXISTS "Users can update their own bags" ON "user_bags";
DROP POLICY IF EXISTS "Users can delete their own bags" ON "user_bags";
DROP POLICY IF EXISTS "Public bags are viewable by everyone" ON "user_bags";
DROP POLICY IF EXISTS "public_bags_read" ON "user_bags";
DROP POLICY IF EXISTS "public_read_user_bags" ON "user_bags";
DROP POLICY IF EXISTS "allow_public_read_bags" ON "user_bags";
DROP POLICY IF EXISTS "Users can manage own bags" ON "user_bags";
DROP POLICY IF EXISTS "users_manage_own_bags" ON "user_bags";

-- ============================================================================
-- BAG_EQUIPMENT POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "bag_equipment";
DROP POLICY IF EXISTS "Bag equipment is viewable by everyone" ON "bag_equipment";
DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON "bag_equipment";
DROP POLICY IF EXISTS "Bag equipment viewable with bag" ON "bag_equipment";
DROP POLICY IF EXISTS "public_bag_equipment_read" ON "bag_equipment";
DROP POLICY IF EXISTS "public_read_bag_equipment" ON "bag_equipment";
DROP POLICY IF EXISTS "allow_public_read_bag_equipment" ON "bag_equipment";
DROP POLICY IF EXISTS "Users manage own bag equipment" ON "bag_equipment";
DROP POLICY IF EXISTS "users_manage_own_bag_equipment" ON "bag_equipment";

-- ============================================================================
-- EQUIPMENT_SAVES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "private_to_user" ON "equipment_saves";
DROP POLICY IF EXISTS "Equipment saves viewable by owner" ON "equipment_saves";
DROP POLICY IF EXISTS "public_equipment_saves_read" ON "equipment_saves";

-- ============================================================================
-- EQUIPMENT_TEES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "equipment_tees";
DROP POLICY IF EXISTS "Anyone can view equipment tees" ON "equipment_tees";
DROP POLICY IF EXISTS "Authenticated users can tee equipment" ON "equipment_tees";
DROP POLICY IF EXISTS "Users can untee equipment" ON "equipment_tees";
DROP POLICY IF EXISTS "Users can view all equipment tees" ON "equipment_tees";
DROP POLICY IF EXISTS "Users can tee equipment" ON "equipment_tees";
DROP POLICY IF EXISTS "Equipment tees viewable by all" ON "equipment_tees";
DROP POLICY IF EXISTS "public_equipment_tees_read" ON "equipment_tees";
DROP POLICY IF EXISTS "allow_public_read_equipment_tees" ON "equipment_tees";

-- ============================================================================
-- BAG_TEES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "bag_tees";
DROP POLICY IF EXISTS "Anyone can view bag tees" ON "bag_tees";
DROP POLICY IF EXISTS "Authenticated users can tee bags" ON "bag_tees";
DROP POLICY IF EXISTS "Users can untee bags" ON "bag_tees";
DROP POLICY IF EXISTS "Users can view all bag tees" ON "bag_tees";
DROP POLICY IF EXISTS "Users can tee bags" ON "bag_tees";
DROP POLICY IF EXISTS "Bag tees viewable by all" ON "bag_tees";
DROP POLICY IF EXISTS "public_bag_tees_read" ON "bag_tees";
DROP POLICY IF EXISTS "allow_public_read_bag_tees" ON "bag_tees";
DROP POLICY IF EXISTS "users_manage_own_bag_tees" ON "bag_tees";

-- ============================================================================
-- FEED_COMMENTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "feed_comments";
DROP POLICY IF EXISTS "Comments viewable by all" ON "feed_comments";
DROP POLICY IF EXISTS "public_feed_comments_read" ON "feed_comments";
DROP POLICY IF EXISTS "allow_public_read_feed_comments" ON "feed_comments";
DROP POLICY IF EXISTS "Users manage own comments" ON "feed_comments";
DROP POLICY IF EXISTS "users_manage_own_comments" ON "feed_comments";

-- ============================================================================
-- EQUIPMENT_REVIEWS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "equipment_reviews";
DROP POLICY IF EXISTS "Equipment reviews viewable by all" ON "equipment_reviews";
DROP POLICY IF EXISTS "public_equipment_reviews_read" ON "equipment_reviews";

-- ============================================================================
-- EQUIPMENT_WISHLIST POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "private_to_user" ON "equipment_wishlist";
DROP POLICY IF EXISTS "Equipment wishlist private to user" ON "equipment_wishlist";

-- ============================================================================
-- BAG_LIKES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "bag_likes";
DROP POLICY IF EXISTS "Bag likes viewable by all" ON "bag_likes";
DROP POLICY IF EXISTS "public_bag_likes_read" ON "bag_likes";
DROP POLICY IF EXISTS "allow_public_read_bag_likes" ON "bag_likes";
DROP POLICY IF EXISTS "users_manage_own_bag_likes" ON "bag_likes";

-- ============================================================================
-- USER_BADGES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "user_badges";

-- ============================================================================
-- BADGES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "badges";

-- ============================================================================
-- LOFT_OPTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "loft_options";

-- ============================================================================
-- FORUM_CATEGORIES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "forum_categories";

-- ============================================================================
-- FORUM_THREADS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "forum_threads";

-- ============================================================================
-- FORUM_POSTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "forum_posts";

-- ============================================================================
-- FORUM_REACTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_read" ON "forum_reactions";
DROP POLICY IF EXISTS "allow_all_select_forum_reactions" ON "forum_reactions";
DROP POLICY IF EXISTS "allow_all_insert_forum_reactions" ON "forum_reactions";
DROP POLICY IF EXISTS "allow_all_delete_forum_reactions" ON "forum_reactions";
DROP POLICY IF EXISTS "forum_reactions_select_policy" ON "forum_reactions";
DROP POLICY IF EXISTS "forum_reactions_insert_policy" ON "forum_reactions";
DROP POLICY IF EXISTS "forum_reactions_delete_policy" ON "forum_reactions";

-- ============================================================================
-- ADDITIONAL TABLES (if they exist)
-- ============================================================================
DROP POLICY IF EXISTS "Equipment prices viewable by all" ON "equipment_prices";
DROP POLICY IF EXISTS "public_equipment_prices_read" ON "equipment_prices";

-- ============================================================================
-- VERIFY CLEANUP COMPLETED
-- ============================================================================
SELECT 
  'RLS POLICIES AFTER CLEANUP' as status,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'equipment', 'user_bags', 'bag_equipment', 
  'equipment_photos', 'equipment_reviews', 'equipment_saves', 
  'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
  'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
  'user_badges', 'badges', 'loft_options', 'forum_categories',
  'forum_threads', 'forum_posts', 'forum_reactions'
);

-- Show any remaining policies (should be empty after cleanup)
SELECT 
  tablename,
  policyname,
  cmd
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
ORDER BY tablename, policyname;