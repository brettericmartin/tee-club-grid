-- ============================================
-- COMPLETE RLS POLICIES FIX FOR TEED.CLUB
-- ============================================
-- Purpose: Ensure all tables are accessible for reading by everyone (logged in or not)
--          but only allow modifications by authenticated users for their own data
-- 
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- 1. FEED_POSTS - Core feed content
-- ============================================
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their posts" ON public.feed_posts;

-- CREATE policies
CREATE POLICY "Anyone can view posts" 
  ON public.feed_posts 
  FOR SELECT 
  TO public  -- This includes both anon and authenticated
  USING (true);  -- No restrictions on viewing

CREATE POLICY "Authenticated users can create posts" 
  ON public.feed_posts 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
  ON public.feed_posts 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
  ON public.feed_posts 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 2. FEED_LIKES - Tees/likes on posts
-- ============================================
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike their own" ON public.feed_likes;

-- CREATE policies
CREATE POLICY "Anyone can view likes" 
  ON public.feed_likes 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Authenticated users can like posts" 
  ON public.feed_likes 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
  ON public.feed_likes 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 3. PROFILES - User profile information
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- CREATE policies
CREATE POLICY "Anyone can view profiles" 
  ON public.profiles 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can create their own profile" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. USER_FOLLOWS - Following relationships
-- ============================================
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;

-- CREATE policies
CREATE POLICY "Anyone can view follows" 
  ON public.user_follows 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Authenticated users can follow" 
  ON public.user_follows 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
  ON public.user_follows 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = follower_id);

-- ============================================
-- 5. EQUIPMENT - Golf equipment catalog
-- ============================================
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can update equipment they added" ON public.equipment;

-- CREATE policies
CREATE POLICY "Anyone can view equipment" 
  ON public.equipment 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Authenticated users can add equipment" 
  ON public.equipment 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update equipment they added" 
  ON public.equipment 
  FOR UPDATE 
  TO authenticated 
  USING (added_by_user_id = auth.uid() OR added_by_user_id IS NULL)
  WITH CHECK (added_by_user_id = auth.uid() OR added_by_user_id IS NULL);

-- ============================================
-- 6. EQUIPMENT_PHOTOS - User-uploaded equipment photos
-- ============================================
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can manage their photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can delete their photos" ON public.equipment_photos;

-- CREATE policies
CREATE POLICY "Anyone can view equipment photos" 
  ON public.equipment_photos 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Authenticated users can upload photos" 
  ON public.equipment_photos 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" 
  ON public.equipment_photos 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
  ON public.equipment_photos 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 7. USER_BAGS - User's golf bag collections
-- ============================================
ALTER TABLE public.user_bags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bags are viewable by everyone" ON public.user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON public.user_bags;

-- CREATE policies
CREATE POLICY "Anyone can view bags" 
  ON public.user_bags 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can create their own bags" 
  ON public.user_bags 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bags" 
  ON public.user_bags 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bags" 
  ON public.user_bags 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 8. BAG_EQUIPMENT - Equipment in user bags
-- ============================================
ALTER TABLE public.bag_equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bag equipment is viewable by everyone" ON public.bag_equipment;
DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON public.bag_equipment;

-- CREATE policies
CREATE POLICY "Anyone can view bag equipment" 
  ON public.bag_equipment 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can manage equipment in their own bags" 
  ON public.bag_equipment 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- ============================================
-- 9. EQUIPMENT_SAVES - Saved/bookmarked equipment
-- ============================================
-- Check if table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_saves') THEN
    ALTER TABLE public.equipment_saves ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view saves" ON public.equipment_saves;
    DROP POLICY IF EXISTS "Users can save equipment" ON public.equipment_saves;
    DROP POLICY IF EXISTS "Users can unsave equipment" ON public.equipment_saves;
    
    -- CREATE policies
    CREATE POLICY "Anyone can view saves" 
      ON public.equipment_saves 
      FOR SELECT 
      TO public 
      USING (true);
    
    CREATE POLICY "Users can save equipment" 
      ON public.equipment_saves 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can unsave equipment" 
      ON public.equipment_saves 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 10. EQUIPMENT_TEES - Tees/likes on equipment
-- ============================================
-- Check if table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_tees') THEN
    ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view tees" ON public.equipment_tees;
    DROP POLICY IF EXISTS "Users can tee equipment" ON public.equipment_tees;
    DROP POLICY IF EXISTS "Users can untee equipment" ON public.equipment_tees;
    
    -- CREATE policies
    CREATE POLICY "Anyone can view tees" 
      ON public.equipment_tees 
      FOR SELECT 
      TO public 
      USING (true);
    
    CREATE POLICY "Users can tee equipment" 
      ON public.equipment_tees 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can untee equipment" 
      ON public.equipment_tees 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 11. BAG_TEES - Tees/likes on bags
-- ============================================
-- Check if table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_tees') THEN
    ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view bag tees" ON public.bag_tees;
    DROP POLICY IF EXISTS "Users can tee bags" ON public.bag_tees;
    DROP POLICY IF EXISTS "Users can untee bags" ON public.bag_tees;
    
    -- CREATE policies
    CREATE POLICY "Anyone can view bag tees" 
      ON public.bag_tees 
      FOR SELECT 
      TO public 
      USING (true);
    
    CREATE POLICY "Users can tee bags" 
      ON public.bag_tees 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can untee bags" 
      ON public.bag_tees 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Ensure anon and authenticated roles have proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT to everyone, ALL to authenticated for core tables
GRANT SELECT ON public.feed_posts TO anon;
GRANT ALL ON public.feed_posts TO authenticated;

GRANT SELECT ON public.feed_likes TO anon;
GRANT ALL ON public.feed_likes TO authenticated;

GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;

GRANT SELECT ON public.user_follows TO anon;
GRANT ALL ON public.user_follows TO authenticated;

GRANT SELECT ON public.equipment TO anon;
GRANT ALL ON public.equipment TO authenticated;

GRANT SELECT ON public.equipment_photos TO anon;
GRANT ALL ON public.equipment_photos TO authenticated;

GRANT SELECT ON public.user_bags TO anon;
GRANT ALL ON public.user_bags TO authenticated;

GRANT SELECT ON public.bag_equipment TO anon;
GRANT ALL ON public.bag_equipment TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all policies are correctly set:
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'feed_posts', 'feed_likes', 'profiles', 'user_follows',
    'equipment', 'equipment_photos', 'user_bags', 'bag_equipment'
  )
ORDER BY tablename, cmd, policyname;

-- ============================================
-- END OF RLS POLICIES FIX
-- ============================================
-- After running this script:
-- 1. Test loading the feed when logged out
-- 2. Test loading the feed when logged in
-- 3. Test creating a post when logged in
-- 4. Test liking/teeing a post when logged in
-- 5. All read operations should work for everyone
-- 6. All write operations should require authentication