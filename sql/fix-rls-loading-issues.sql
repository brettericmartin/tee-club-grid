-- 🔧 COMPREHENSIVE RLS FIX FOR DATA LOADING ISSUES
-- Purpose: Fix authentication and RLS issues preventing data from loading
-- Execute this in Supabase Dashboard > SQL Editor

-- ========================================
-- 1. FIX FEED_POSTS POLICIES
-- ========================================
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their posts" ON public.feed_posts;

-- Create new policies with proper access
CREATE POLICY "Anyone can view posts" 
ON public.feed_posts 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can create posts" 
ON public.feed_posts 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their posts" 
ON public.feed_posts 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their posts" 
ON public.feed_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ========================================
-- 2. FIX FEED_LIKES POLICIES
-- ========================================
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike their own" ON public.feed_likes;

-- Create new policies
CREATE POLICY "Anyone can view likes" 
ON public.feed_likes 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can like" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ========================================
-- 3. FIX PROFILES POLICIES
-- ========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- 4. FIX EQUIPMENT POLICIES
-- ========================================
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can update equipment they added" ON public.equipment;

-- Create new policies
CREATE POLICY "Equipment is viewable by everyone" 
ON public.equipment 
FOR SELECT 
TO authenticated, anon 
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

-- ========================================
-- 5. FIX EQUIPMENT_PHOTOS POLICIES
-- ========================================
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can manage their photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can delete their photos" ON public.equipment_photos;

-- Create new policies (using correct column name: user_id)
CREATE POLICY "Anyone can view equipment photos" 
ON public.equipment_photos 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can upload photos" 
ON public.equipment_photos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their photos" 
ON public.equipment_photos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their photos" 
ON public.equipment_photos 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ========================================
-- 6. FIX USER_BAGS POLICIES
-- ========================================
ALTER TABLE public.user_bags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bags are viewable by everyone" ON public.user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON public.user_bags;

-- Create new policies
CREATE POLICY "Bags are viewable by everyone" 
ON public.user_bags 
FOR SELECT 
TO authenticated, anon 
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

-- ========================================
-- 7. FIX BAG_EQUIPMENT POLICIES
-- ========================================
ALTER TABLE public.bag_equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bag equipment is viewable by everyone" ON public.bag_equipment;
DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON public.bag_equipment;

-- Create new policies
CREATE POLICY "Bag equipment is viewable by everyone" 
ON public.bag_equipment 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can manage equipment in their bags" 
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

-- ========================================
-- 8. FIX USER_FOLLOWS POLICIES
-- ========================================
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;

-- Create new policies
CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- ========================================
-- VERIFY ALL POLICIES ARE APPLIED
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN (
  'feed_posts', 'feed_likes', 'profiles', 'equipment', 
  'equipment_photos', 'user_bags', 'bag_equipment', 'user_follows'
)
ORDER BY tablename, cmd, policyname;