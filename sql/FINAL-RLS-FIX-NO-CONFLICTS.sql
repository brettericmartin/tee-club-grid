-- ============================================
-- FINAL RLS FIX - NO CONFLICTS VERSION
-- ============================================
-- This script safely handles all existing policies
-- by dropping them with IF EXISTS before creating new ones
-- 
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Helper function to safely drop policies
CREATE OR REPLACE FUNCTION drop_policy_if_exists(
  table_name text,
  policy_name text
) RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Policy doesn't exist, that's fine
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. FEED_POSTS
-- ============================================
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for feed_posts
SELECT drop_policy_if_exists('feed_posts', 'public_read');
SELECT drop_policy_if_exists('feed_posts', 'authenticated_insert');
SELECT drop_policy_if_exists('feed_posts', 'authenticated_update');
SELECT drop_policy_if_exists('feed_posts', 'authenticated_delete');
SELECT drop_policy_if_exists('feed_posts', 'Anyone can view posts');
SELECT drop_policy_if_exists('feed_posts', 'Users can create posts');
SELECT drop_policy_if_exists('feed_posts', 'Users can update their posts');
SELECT drop_policy_if_exists('feed_posts', 'Users can delete their posts');
SELECT drop_policy_if_exists('feed_posts', 'Authenticated users can create posts');
SELECT drop_policy_if_exists('feed_posts', 'Users can update their own posts');
SELECT drop_policy_if_exists('feed_posts', 'Users can delete their own posts');
SELECT drop_policy_if_exists('feed_posts', 'Enable read access for all users');
SELECT drop_policy_if_exists('feed_posts', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('feed_posts', 'Enable update for users based on user_id');
SELECT drop_policy_if_exists('feed_posts', 'Enable delete for users based on user_id');

-- Create clean policies with unique names
CREATE POLICY "feed_posts_public_select_v2" 
  ON public.feed_posts FOR SELECT TO public USING (true);

CREATE POLICY "feed_posts_auth_insert_v2" 
  ON public.feed_posts FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_posts_auth_update_v2" 
  ON public.feed_posts FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_posts_auth_delete_v2" 
  ON public.feed_posts FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 2. FEED_LIKES
-- ============================================
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for feed_likes
SELECT drop_policy_if_exists('feed_likes', 'public_read');
SELECT drop_policy_if_exists('feed_likes', 'authenticated_insert');
SELECT drop_policy_if_exists('feed_likes', 'authenticated_delete');
SELECT drop_policy_if_exists('feed_likes', 'Anyone can view likes');
SELECT drop_policy_if_exists('feed_likes', 'Anyone can view feed likes');
SELECT drop_policy_if_exists('feed_likes', 'Authenticated users can like');
SELECT drop_policy_if_exists('feed_likes', 'Authenticated users can like posts');
SELECT drop_policy_if_exists('feed_likes', 'Users can unlike their own');
SELECT drop_policy_if_exists('feed_likes', 'Users can remove their own likes');
SELECT drop_policy_if_exists('feed_likes', 'Users can like posts');
SELECT drop_policy_if_exists('feed_likes', 'Users can unlike posts');
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_select_policy');
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_insert_policy');
SELECT drop_policy_if_exists('feed_likes', 'feed_likes_delete_policy');
SELECT drop_policy_if_exists('feed_likes', 'allow_public_read_feed_likes');
SELECT drop_policy_if_exists('feed_likes', 'allow_authenticated_insert_feed_likes');
SELECT drop_policy_if_exists('feed_likes', 'allow_authenticated_delete_feed_likes');
SELECT drop_policy_if_exists('feed_likes', 'Enable read access for all users');
SELECT drop_policy_if_exists('feed_likes', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('feed_likes', 'Enable delete for users based on user_id');

-- Create clean policies with unique names
CREATE POLICY "feed_likes_public_select_v2" 
  ON public.feed_likes FOR SELECT TO public USING (true);

CREATE POLICY "feed_likes_auth_insert_v2" 
  ON public.feed_likes FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_likes_auth_delete_v2" 
  ON public.feed_likes FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 3. PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for profiles
SELECT drop_policy_if_exists('profiles', 'public_read');
SELECT drop_policy_if_exists('profiles', 'authenticated_insert');
SELECT drop_policy_if_exists('profiles', 'authenticated_update');
SELECT drop_policy_if_exists('profiles', 'Public profiles are viewable by everyone');
SELECT drop_policy_if_exists('profiles', 'Anyone can view profiles');
SELECT drop_policy_if_exists('profiles', 'Users can insert their own profile');
SELECT drop_policy_if_exists('profiles', 'Users can create their own profile');
SELECT drop_policy_if_exists('profiles', 'Users can update own profile');
SELECT drop_policy_if_exists('profiles', 'Users can update their own profile');
SELECT drop_policy_if_exists('profiles', 'Enable read access for all users');
SELECT drop_policy_if_exists('profiles', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('profiles', 'Enable update for users based on id');

-- Create clean policies with unique names
CREATE POLICY "profiles_public_select_v2" 
  ON public.profiles FOR SELECT TO public USING (true);

CREATE POLICY "profiles_auth_insert_v2" 
  ON public.profiles FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_auth_update_v2" 
  ON public.profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. USER_FOLLOWS
-- ============================================
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for user_follows
SELECT drop_policy_if_exists('user_follows', 'public_read');
SELECT drop_policy_if_exists('user_follows', 'authenticated_insert');
SELECT drop_policy_if_exists('user_follows', 'authenticated_delete');
SELECT drop_policy_if_exists('user_follows', 'Anyone can view follows');
SELECT drop_policy_if_exists('user_follows', 'Users can follow others');
SELECT drop_policy_if_exists('user_follows', 'Users can unfollow');
SELECT drop_policy_if_exists('user_follows', 'Authenticated users can follow');
SELECT drop_policy_if_exists('user_follows', 'user_follows_select_policy');
SELECT drop_policy_if_exists('user_follows', 'user_follows_insert_policy');
SELECT drop_policy_if_exists('user_follows', 'user_follows_delete_policy');
SELECT drop_policy_if_exists('user_follows', 'Enable read access for all users');
SELECT drop_policy_if_exists('user_follows', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('user_follows', 'Enable delete for users based on follower_id');

-- Create clean policies with unique names
CREATE POLICY "user_follows_public_select_v2" 
  ON public.user_follows FOR SELECT TO public USING (true);

CREATE POLICY "user_follows_auth_insert_v2" 
  ON public.user_follows FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_follows_auth_delete_v2" 
  ON public.user_follows FOR DELETE TO authenticated 
  USING (auth.uid() = follower_id);

-- ============================================
-- 5. EQUIPMENT
-- ============================================
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for equipment
SELECT drop_policy_if_exists('equipment', 'public_read');
SELECT drop_policy_if_exists('equipment', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment', 'authenticated_update');
SELECT drop_policy_if_exists('equipment', 'Equipment is viewable by everyone');
SELECT drop_policy_if_exists('equipment', 'Anyone can view equipment');
SELECT drop_policy_if_exists('equipment', 'Authenticated users can add equipment');
SELECT drop_policy_if_exists('equipment', 'Users can update equipment they added');
SELECT drop_policy_if_exists('equipment', 'Enable read access for all users');
SELECT drop_policy_if_exists('equipment', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('equipment', 'Enable update for equipment creators');

-- Create clean policies with unique names
CREATE POLICY "equipment_public_select_v2" 
  ON public.equipment FOR SELECT TO public USING (true);

CREATE POLICY "equipment_auth_insert_v2" 
  ON public.equipment FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "equipment_auth_update_v2" 
  ON public.equipment FOR UPDATE TO authenticated 
  USING (added_by_user_id = auth.uid() OR added_by_user_id IS NULL)
  WITH CHECK (added_by_user_id = auth.uid() OR added_by_user_id IS NULL);

-- ============================================
-- 6. EQUIPMENT_PHOTOS
-- ============================================
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for equipment_photos
SELECT drop_policy_if_exists('equipment_photos', 'public_read');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_insert');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_update');
SELECT drop_policy_if_exists('equipment_photos', 'authenticated_delete');
SELECT drop_policy_if_exists('equipment_photos', 'Anyone can view equipment photos');
SELECT drop_policy_if_exists('equipment_photos', 'Authenticated users can upload photos');
SELECT drop_policy_if_exists('equipment_photos', 'Users can manage their photos');
SELECT drop_policy_if_exists('equipment_photos', 'Users can update their own photos');
SELECT drop_policy_if_exists('equipment_photos', 'Users can delete their photos');
SELECT drop_policy_if_exists('equipment_photos', 'Users can delete their own photos');
SELECT drop_policy_if_exists('equipment_photos', 'Enable read access for all users');
SELECT drop_policy_if_exists('equipment_photos', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('equipment_photos', 'Enable update for photo owners');
SELECT drop_policy_if_exists('equipment_photos', 'Enable delete for photo owners');

-- Create clean policies with unique names
CREATE POLICY "equipment_photos_public_select_v2" 
  ON public.equipment_photos FOR SELECT TO public USING (true);

CREATE POLICY "equipment_photos_auth_insert_v2" 
  ON public.equipment_photos FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_photos_auth_update_v2" 
  ON public.equipment_photos FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_photos_auth_delete_v2" 
  ON public.equipment_photos FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 7. USER_BAGS
-- ============================================
ALTER TABLE public.user_bags ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for user_bags
SELECT drop_policy_if_exists('user_bags', 'public_read');
SELECT drop_policy_if_exists('user_bags', 'authenticated_insert');
SELECT drop_policy_if_exists('user_bags', 'authenticated_update');
SELECT drop_policy_if_exists('user_bags', 'authenticated_delete');
SELECT drop_policy_if_exists('user_bags', 'Bags are viewable by everyone');
SELECT drop_policy_if_exists('user_bags', 'Anyone can view bags');
SELECT drop_policy_if_exists('user_bags', 'Users can create their own bags');
SELECT drop_policy_if_exists('user_bags', 'Users can update their own bags');
SELECT drop_policy_if_exists('user_bags', 'Users can delete their own bags');
SELECT drop_policy_if_exists('user_bags', 'Enable read access for all users');
SELECT drop_policy_if_exists('user_bags', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('user_bags', 'Enable update for bag owners');
SELECT drop_policy_if_exists('user_bags', 'Enable delete for bag owners');

-- Create clean policies with unique names
CREATE POLICY "user_bags_public_select_v2" 
  ON public.user_bags FOR SELECT TO public USING (true);

CREATE POLICY "user_bags_auth_insert_v2" 
  ON public.user_bags FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bags_auth_update_v2" 
  ON public.user_bags FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bags_auth_delete_v2" 
  ON public.user_bags FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 8. BAG_EQUIPMENT
-- ============================================
ALTER TABLE public.bag_equipment ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policy names for bag_equipment
SELECT drop_policy_if_exists('bag_equipment', 'public_read');
SELECT drop_policy_if_exists('bag_equipment', 'authenticated_all');
SELECT drop_policy_if_exists('bag_equipment', 'Bag equipment is viewable by everyone');
SELECT drop_policy_if_exists('bag_equipment', 'Anyone can view bag equipment');
SELECT drop_policy_if_exists('bag_equipment', 'Users can manage equipment in their bags');
SELECT drop_policy_if_exists('bag_equipment', 'Users can manage equipment in their own bags');
SELECT drop_policy_if_exists('bag_equipment', 'Enable read access for all users');
SELECT drop_policy_if_exists('bag_equipment', 'Enable all for bag owners');

-- Create clean policies with unique names
CREATE POLICY "bag_equipment_public_select_v2" 
  ON public.bag_equipment FOR SELECT TO public USING (true);

CREATE POLICY "bag_equipment_auth_all_v2" 
  ON public.bag_equipment FOR ALL TO authenticated 
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
-- 9. EQUIPMENT_SAVES (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_saves') THEN
    ALTER TABLE public.equipment_saves ENABLE ROW LEVEL SECURITY;
    
    -- Drop ALL possible existing policy names
    PERFORM drop_policy_if_exists('equipment_saves', 'public_read');
    PERFORM drop_policy_if_exists('equipment_saves', 'authenticated_insert');
    PERFORM drop_policy_if_exists('equipment_saves', 'authenticated_delete');
    PERFORM drop_policy_if_exists('equipment_saves', 'Anyone can view saves');
    PERFORM drop_policy_if_exists('equipment_saves', 'Users can save equipment');
    PERFORM drop_policy_if_exists('equipment_saves', 'Users can unsave equipment');
    
    -- Create clean policies with unique names
    CREATE POLICY "equipment_saves_public_select_v2" 
      ON public.equipment_saves FOR SELECT TO public USING (true);
    
    CREATE POLICY "equipment_saves_auth_insert_v2" 
      ON public.equipment_saves FOR INSERT TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "equipment_saves_auth_delete_v2" 
      ON public.equipment_saves FOR DELETE TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 10. EQUIPMENT_TEES (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_tees') THEN
    ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;
    
    -- Drop ALL possible existing policy names
    PERFORM drop_policy_if_exists('equipment_tees', 'public_read');
    PERFORM drop_policy_if_exists('equipment_tees', 'authenticated_insert');
    PERFORM drop_policy_if_exists('equipment_tees', 'authenticated_delete');
    PERFORM drop_policy_if_exists('equipment_tees', 'Anyone can view tees');
    PERFORM drop_policy_if_exists('equipment_tees', 'Users can tee equipment');
    PERFORM drop_policy_if_exists('equipment_tees', 'Users can untee equipment');
    
    -- Create clean policies with unique names
    CREATE POLICY "equipment_tees_public_select_v2" 
      ON public.equipment_tees FOR SELECT TO public USING (true);
    
    CREATE POLICY "equipment_tees_auth_insert_v2" 
      ON public.equipment_tees FOR INSERT TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "equipment_tees_auth_delete_v2" 
      ON public.equipment_tees FOR DELETE TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 11. BAG_TEES (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_tees') THEN
    ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;
    
    -- Drop ALL possible existing policy names
    PERFORM drop_policy_if_exists('bag_tees', 'public_read');
    PERFORM drop_policy_if_exists('bag_tees', 'authenticated_insert');
    PERFORM drop_policy_if_exists('bag_tees', 'authenticated_delete');
    PERFORM drop_policy_if_exists('bag_tees', 'Anyone can view bag tees');
    PERFORM drop_policy_if_exists('bag_tees', 'Users can tee bags');
    PERFORM drop_policy_if_exists('bag_tees', 'Users can untee bags');
    
    -- Create clean policies with unique names
    CREATE POLICY "bag_tees_public_select_v2" 
      ON public.bag_tees FOR SELECT TO public USING (true);
    
    CREATE POLICY "bag_tees_auth_insert_v2" 
      ON public.bag_tees FOR INSERT TO authenticated 
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "bag_tees_auth_delete_v2" 
      ON public.bag_tees FOR DELETE TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Core tables
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
-- CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS drop_policy_if_exists(text, text);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created successfully
SELECT 
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
  AND policyname LIKE '%_v2'
ORDER BY tablename, cmd;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE 'RLS policies have been successfully updated!';
  RAISE NOTICE 'All tables now have v2 policies that allow:';
  RAISE NOTICE '  - Public READ access (logged in or not)';
  RAISE NOTICE '  - Authenticated WRITE access (create/update/delete own data)';
END $$;