-- RLS Policies for Teed.club
-- Run this script in your Supabase SQL editor to ensure proper Row Level Security

-- Enable RLS on all necessary tables
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tees ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Equipment Saves Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own saves" ON equipment_saves;
CREATE POLICY "Users can view their own saves" ON equipment_saves 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saves" ON equipment_saves;
CREATE POLICY "Users can create their own saves" ON equipment_saves 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saves" ON equipment_saves;
CREATE POLICY "Users can delete their own saves" ON equipment_saves 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- Equipment Photos Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON equipment_photos;
CREATE POLICY "Anyone can view equipment photos" ON equipment_photos 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can upload their own photos" ON equipment_photos;
CREATE POLICY "Users can upload their own photos" ON equipment_photos 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own photos" ON equipment_photos;
CREATE POLICY "Users can update their own photos" ON equipment_photos 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own photos" ON equipment_photos;
CREATE POLICY "Users can delete their own photos" ON equipment_photos 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- Equipment Wishlist Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own wishlist" ON equipment_wishlist;
CREATE POLICY "Users can view their own wishlist" ON equipment_wishlist 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their wishlist" ON equipment_wishlist;
CREATE POLICY "Users can add to their wishlist" ON equipment_wishlist 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their wishlist" ON equipment_wishlist;
CREATE POLICY "Users can update their wishlist" ON equipment_wishlist 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from wishlist" ON equipment_wishlist;
CREATE POLICY "Users can remove from wishlist" ON equipment_wishlist 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- User Follows Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows;
CREATE POLICY "Anyone can view follows" ON user_follows 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON user_follows;
CREATE POLICY "Users can follow others" ON user_follows 
  FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON user_follows;
CREATE POLICY "Users can unfollow" ON user_follows 
  FOR DELETE 
  USING (auth.uid() = follower_id);

-- =====================================================
-- Bag Likes/Tees Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view bag likes" ON bag_likes;
CREATE POLICY "Anyone can view bag likes" ON bag_likes 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can like bags" ON bag_likes;
CREATE POLICY "Users can like bags" ON bag_likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike bags" ON bag_likes;
CREATE POLICY "Users can unlike bags" ON bag_likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Same for bag_tees (if using tee terminology)
DROP POLICY IF EXISTS "Anyone can view bag tees" ON bag_tees CASCADE;
CREATE POLICY "Anyone can view bag tees" ON bag_tees 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can tee bags" ON bag_tees CASCADE;
CREATE POLICY "Users can tee bags" ON bag_tees 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can untee bags" ON bag_tees CASCADE;
CREATE POLICY "Users can untee bags" ON bag_tees 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- Photo Likes/Tees Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view photo likes" ON photo_likes;
CREATE POLICY "Anyone can view photo likes" ON photo_likes 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can like photos" ON photo_likes;
CREATE POLICY "Users can like photos" ON photo_likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike photos" ON photo_likes;
CREATE POLICY "Users can unlike photos" ON photo_likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- Equipment Photo Likes Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view equipment photo likes" ON equipment_photo_likes CASCADE;
CREATE POLICY "Anyone can view equipment photo likes" ON equipment_photo_likes 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can like equipment photos" ON equipment_photo_likes CASCADE;
CREATE POLICY "Users can like equipment photos" ON equipment_photo_likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike equipment photos" ON equipment_photo_likes CASCADE;
CREATE POLICY "Users can unlike equipment photos" ON equipment_photo_likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- Storage Bucket Policies
-- =====================================================
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('equipment-photos', 'equipment-photos', true),
  ('user-avatars', 'user-avatars', true),
  ('bag-photos', 'bag-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Equipment Photos Storage Policies
DROP POLICY IF EXISTS "Allow public read equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Allow public read equipment photos" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'equipment-photos');

DROP POLICY IF EXISTS "Allow authenticated upload equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Allow authenticated upload equipment photos" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'equipment-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to update own equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Allow users to update own equipment photos" ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'equipment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Allow users to delete own equipment photos" ON storage.objects CASCADE;
CREATE POLICY "Allow users to delete own equipment photos" ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'equipment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- User Avatars Storage Policies
DROP POLICY IF EXISTS "Allow public read avatars" ON storage.objects CASCADE;
CREATE POLICY "Allow public read avatars" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Allow authenticated upload avatars" ON storage.objects CASCADE;
CREATE POLICY "Allow authenticated upload avatars" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to update own avatars" ON storage.objects CASCADE;
CREATE POLICY "Allow users to update own avatars" ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Allow users to delete own avatars" ON storage.objects CASCADE;
CREATE POLICY "Allow users to delete own avatars" ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Bag Photos Storage Policies
DROP POLICY IF EXISTS "Allow public read bag photos" ON storage.objects CASCADE;
CREATE POLICY "Allow public read bag photos" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'bag-photos');

DROP POLICY IF EXISTS "Allow authenticated upload bag photos" ON storage.objects CASCADE;
CREATE POLICY "Allow authenticated upload bag photos" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'bag-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to update own bag photos" ON storage.objects CASCADE;
CREATE POLICY "Allow users to update own bag photos" ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'bag-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Allow users to delete own bag photos" ON storage.objects CASCADE;
CREATE POLICY "Allow users to delete own bag photos" ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'bag-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- Additional Important Policies
-- =====================================================

-- User bags should be viewable by everyone but only editable by owner
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public bags" ON user_bags CASCADE;
CREATE POLICY "Anyone can view public bags" ON user_bags 
  FOR SELECT 
  USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can create their own bags" ON user_bags 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can update their own bags" ON user_bags 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bags" ON user_bags CASCADE;
CREATE POLICY "Users can delete their own bags" ON user_bags 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Bag equipment should follow bag visibility
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View bag equipment for visible bags" ON bag_equipment CASCADE;
CREATE POLICY "View bag equipment for visible bags" ON bag_equipment 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON bag_equipment CASCADE;
CREATE POLICY "Users can manage equipment in their bags" ON bag_equipment 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Equipment should be viewable by all
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment CASCADE;
CREATE POLICY "Anyone can view equipment" ON equipment 
  FOR SELECT 
  USING (true);

-- Profiles should be viewable by all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by all" ON profiles CASCADE;
CREATE POLICY "Profiles are viewable by all" ON profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been successfully applied!';
END $$;