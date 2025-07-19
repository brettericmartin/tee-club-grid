-- Comprehensive RLS Policy Restoration Script
-- Run this in Supabase SQL editor to restore all RLS policies
-- Created after database restoration to fix all policies

-- =====================================================
-- PART 1: Enable RLS on all necessary tables
-- =====================================================
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photo_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Equipment and Equipment Photos Policies
-- =====================================================

-- Equipment table - viewable by all, editable by owner
DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment CASCADE;
CREATE POLICY "Anyone can view equipment" ON equipment 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add equipment" ON equipment CASCADE;
CREATE POLICY "Authenticated users can add equipment" ON equipment 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own equipment" ON equipment CASCADE;
CREATE POLICY "Users can update own equipment" ON equipment 
  FOR UPDATE USING (auth.uid() = added_by_user_id);

-- Equipment photos - community contribution model
DROP POLICY IF EXISTS "Equipment photos are viewable by everyone" ON equipment_photos CASCADE;
CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload equipment photos" ON equipment_photos CASCADE;
CREATE POLICY "Authenticated users can upload equipment photos" ON equipment_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own photos" ON equipment_photos CASCADE;
CREATE POLICY "Users can update own photos" ON equipment_photos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own photos" ON equipment_photos CASCADE;
CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Equipment photo votes
DROP POLICY IF EXISTS "Anyone can view votes" ON equipment_photo_votes CASCADE;
CREATE POLICY "Anyone can view votes" ON equipment_photo_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on photos" ON equipment_photo_votes CASCADE;
CREATE POLICY "Users can vote on photos" ON equipment_photo_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change their vote" ON equipment_photo_votes CASCADE;
CREATE POLICY "Users can change their vote" ON equipment_photo_votes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their vote" ON equipment_photo_votes CASCADE;
CREATE POLICY "Users can remove their vote" ON equipment_photo_votes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PART 3: User Bags and Related Policies
-- =====================================================

-- User bags - viewable by all, editable by owner
DROP POLICY IF EXISTS "Anyone can view bags" ON user_bags CASCADE;
CREATE POLICY "Anyone can view bags" ON user_bags 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can create their own bags" ON user_bags 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can update their own bags" ON user_bags 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can delete their own bags" ON user_bags 
  FOR DELETE USING (auth.uid() = user_id);

-- Bag equipment - follows bag visibility
DROP POLICY IF EXISTS "View bag equipment for visible bags" ON bag_equipment CASCADE;
CREATE POLICY "View bag equipment for visible bags" ON bag_equipment 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id
    )
  );

DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON bag_equipment CASCADE;
CREATE POLICY "Users can manage equipment in their bags" ON bag_equipment 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 4: Social Features (Likes, Follows, Saves)
-- =====================================================

-- Equipment saves
DROP POLICY IF EXISTS "Users can view their own saves" ON equipment_saves CASCADE;
CREATE POLICY "Users can view their own saves" ON equipment_saves 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saves" ON equipment_saves CASCADE;
CREATE POLICY "Users can create their own saves" ON equipment_saves 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saves" ON equipment_saves CASCADE;
CREATE POLICY "Users can delete their own saves" ON equipment_saves 
  FOR DELETE USING (auth.uid() = user_id);

-- User follows
DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows CASCADE;
CREATE POLICY "Anyone can view follows" ON user_follows 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON user_follows CASCADE;
CREATE POLICY "Users can follow others" ON user_follows 
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON user_follows CASCADE;
CREATE POLICY "Users can unfollow" ON user_follows 
  FOR DELETE USING (auth.uid() = follower_id);

-- Bag likes
DROP POLICY IF EXISTS "Anyone can view bag likes" ON bag_likes CASCADE;
CREATE POLICY "Anyone can view bag likes" ON bag_likes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like bags" ON bag_likes CASCADE;
CREATE POLICY "Users can like bags" ON bag_likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike bags" ON bag_likes CASCADE;
CREATE POLICY "Users can unlike bags" ON bag_likes 
  FOR DELETE USING (auth.uid() = user_id);

-- General likes table
DROP POLICY IF EXISTS "Anyone can view likes" ON likes CASCADE;
CREATE POLICY "Anyone can view likes" ON likes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create likes" ON likes CASCADE;
CREATE POLICY "Users can create likes" ON likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their likes" ON likes CASCADE;
CREATE POLICY "Users can delete their likes" ON likes 
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PART 5: Feed System Policies
-- =====================================================

-- Feed posts
DROP POLICY IF EXISTS "Anyone can view feed posts" ON feed_posts CASCADE;
CREATE POLICY "Anyone can view feed posts" ON feed_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON feed_posts CASCADE;
CREATE POLICY "Authenticated users can create posts" ON feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON feed_posts CASCADE;
CREATE POLICY "Users can update own posts" ON feed_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON feed_posts CASCADE;
CREATE POLICY "Users can delete own posts" ON feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Feed likes
DROP POLICY IF EXISTS "Anyone can view feed likes" ON feed_likes CASCADE;
CREATE POLICY "Anyone can view feed likes" ON feed_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON feed_likes CASCADE;
CREATE POLICY "Users can like posts" ON feed_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON feed_likes CASCADE;
CREATE POLICY "Users can unlike posts" ON feed_likes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PART 6: Profile and Badge Policies
-- =====================================================

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by all" ON profiles CASCADE;
CREATE POLICY "Profiles are viewable by all" ON profiles 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Badges
DROP POLICY IF EXISTS "Anyone can view badges" ON badges CASCADE;
CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);

-- User badges
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges CASCADE;
CREATE POLICY "Anyone can view user badges" ON user_badges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can award badges" ON user_badges CASCADE;
CREATE POLICY "System can award badges" ON user_badges
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own badges" ON user_badges CASCADE;
CREATE POLICY "Users can update own badges" ON user_badges
  FOR UPDATE USING (auth.uid() = user_id);

-- Badge notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON badge_notifications CASCADE;
CREATE POLICY "Users can view own notifications" ON badge_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON badge_notifications CASCADE;
CREATE POLICY "Users can update own notifications" ON badge_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- PART 7: Storage Bucket Policies
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Equipment photos bucket
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Anyone can view equipment photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'equipment-photos');

DROP POLICY IF EXISTS "Authenticated users can upload equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Authenticated users can upload equipment photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'equipment-photos' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Users can update own equipment photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'equipment-photos' 
    AND auth.uid() = owner
  );

DROP POLICY IF EXISTS "Users can delete own equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Users can delete own equipment photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'equipment-photos' 
    AND auth.uid() = owner
  );

-- User content bucket (for avatars, bag photos, etc)
DROP POLICY IF EXISTS "Anyone can view user content" ON storage.objects CASCADE;
CREATE POLICY "Anyone can view user content" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-content');

DROP POLICY IF EXISTS "Authenticated users can upload user content" ON storage.objects CASCADE;
CREATE POLICY "Authenticated users can upload user content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-content' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own user content" ON storage.objects CASCADE;
CREATE POLICY "Users can update own user content" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-content' 
    AND auth.uid() = owner
  );

DROP POLICY IF EXISTS "Users can delete own user content" ON storage.objects CASCADE;
CREATE POLICY "Users can delete own user content" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-content' 
    AND auth.uid() = owner
  );

-- =====================================================
-- PART 8: Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS POLICIES RESTORED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of what was configured:';
  RAISE NOTICE '1. Equipment & Photos: Public viewing, authenticated uploads';
  RAISE NOTICE '2. User Bags: Public viewing, owner-only editing';
  RAISE NOTICE '3. Social Features: Proper likes, follows, saves policies';
  RAISE NOTICE '4. Feed System: Public posts, owner-only editing';
  RAISE NOTICE '5. Storage Buckets: Proper file upload/access policies';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Check Supabase dashboard Storage tab to ensure:';
  RAISE NOTICE '   - equipment-photos bucket exists and is PUBLIC';
  RAISE NOTICE '   - user-content bucket exists and is PUBLIC';
  RAISE NOTICE '';
END $$;