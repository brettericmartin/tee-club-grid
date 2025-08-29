-- ====================================================================
-- EMERGENCY FIX - RESTORE SITE FUNCTIONALITY
-- ====================================================================
-- This script fixes the broken RLS policies that are causing:
-- 1. Infinite recursion in profiles queries
-- 2. Admin access not working
-- 3. Bags not showing up
-- 4. Users being shown waitlist when they shouldn't
-- ====================================================================

-- ====================================================================
-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- ====================================================================

-- Drop ALL existing policies on profiles to start clean
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Drop policies on other tables that might be causing issues
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_bags', 'bag_equipment', 'equipment_photos', 'feed_posts')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ====================================================================
-- STEP 2: CREATE SIMPLE, WORKING POLICIES FOR PROFILES
-- ====================================================================

-- CRITICAL: Simple SELECT policy that won't cause recursion
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Enable insert for users based on id" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ====================================================================
-- STEP 3: FIX USER_BAGS POLICIES
-- ====================================================================

-- Everyone can see all bags
CREATE POLICY "Enable read access for all users" ON user_bags
    FOR SELECT
    USING (true);

-- Users can insert their own bags
CREATE POLICY "Enable insert for users based on user_id" ON user_bags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own bags
CREATE POLICY "Enable update for users based on user_id" ON user_bags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bags
CREATE POLICY "Enable delete for users based on user_id" ON user_bags
    FOR DELETE
    USING (auth.uid() = user_id);

-- ====================================================================
-- STEP 4: FIX BAG_EQUIPMENT POLICIES
-- ====================================================================

-- Everyone can see all bag equipment
CREATE POLICY "Enable read access for all users" ON bag_equipment
    FOR SELECT
    USING (true);

-- Users can manage equipment in their own bags
CREATE POLICY "Enable insert for bag owners" ON bag_equipment
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable update for bag owners" ON bag_equipment
    FOR UPDATE
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

CREATE POLICY "Enable delete for bag owners" ON bag_equipment
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

-- ====================================================================
-- STEP 5: FIX EQUIPMENT_PHOTOS POLICIES
-- ====================================================================

-- Everyone can see all photos
CREATE POLICY "Enable read access for all users" ON equipment_photos
    FOR SELECT
    USING (true);

-- Users can upload photos
CREATE POLICY "Enable insert for authenticated users" ON equipment_photos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Enable update for photo owners" ON equipment_photos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Enable delete for photo owners" ON equipment_photos
    FOR DELETE
    USING (auth.uid() = user_id);

-- ====================================================================
-- STEP 6: FIX FEED_POSTS POLICIES
-- ====================================================================

-- Everyone can see all posts
CREATE POLICY "Enable read access for all users" ON feed_posts
    FOR SELECT
    USING (true);

-- Users can create posts
CREATE POLICY "Enable insert for authenticated users" ON feed_posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Enable update for post owners" ON feed_posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Enable delete for post owners" ON feed_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ====================================================================
-- STEP 7: FIX WAITLIST_APPLICATIONS POLICIES
-- ====================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Service role bypasses RLS" ON waitlist_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can view applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON waitlist_applications;

-- Anyone can submit an application
CREATE POLICY "Enable insert for all" ON waitlist_applications
    FOR INSERT
    WITH CHECK (true);

-- Only admins can view applications (SIMPLE CHECK - NO RECURSION)
CREATE POLICY "Enable read for admins" ON waitlist_applications
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE is_admin = true
        )
    );

-- Only admins can update applications
CREATE POLICY "Enable update for admins" ON waitlist_applications
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE is_admin = true
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles WHERE is_admin = true
        )
    );

-- ====================================================================
-- STEP 8: VERIFY CRITICAL DATA
-- ====================================================================

-- Check admin users
SELECT 
    'Admin Users' as check_type,
    COUNT(*) as count
FROM profiles 
WHERE is_admin = true;

-- Check beta users
SELECT 
    'Beta Users' as check_type,
    COUNT(*) as count
FROM profiles 
WHERE beta_access = true;

-- Check if your user has admin and beta access
SELECT 
    id, 
    email, 
    username, 
    is_admin, 
    beta_access
FROM profiles 
WHERE email = 'brettmartinplay@gmail.com'
   OR username = 'brettmartinplay';

-- ====================================================================
-- STEP 9: ENSURE YOUR USER HAS PROPER ACCESS
-- ====================================================================

-- Make sure your account has admin and beta access
UPDATE profiles 
SET 
    is_admin = true,
    beta_access = true
WHERE email = 'brettmartinplay@gmail.com'
   OR username = 'brettmartinplay';

-- ====================================================================
-- STEP 10: SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ EMERGENCY FIX APPLIED!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Fixed:';
    RAISE NOTICE '1. Removed recursive policies causing infinite loops';
    RAISE NOTICE '2. Created simple, working RLS policies';
    RAISE NOTICE '3. Restored admin access';
    RAISE NOTICE '4. Fixed bag visibility';
    RAISE NOTICE '5. Ensured brettmartinplay has admin+beta access';
    RAISE NOTICE '';
    RAISE NOTICE 'The site should now work properly!';
    RAISE NOTICE '';
END $$;