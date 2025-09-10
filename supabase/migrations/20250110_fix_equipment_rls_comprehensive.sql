-- ====================================================================
-- COMPREHENSIVE RLS FIX FOR EQUIPMENT SYSTEM
-- ====================================================================
-- This migration fixes critical RLS issues preventing users from:
-- 1. Adding new equipment to the platform
-- 2. Adding equipment to their bags
-- 3. Managing their bag contents
-- ====================================================================

-- Step 1: Enable RLS on all equipment-related tables
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- EQUIPMENT TABLE POLICIES
-- ====================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "Public read access" ON equipment;
DROP POLICY IF EXISTS "Enable read access for all users" ON equipment;
DROP POLICY IF EXISTS "equipment_select_policy" ON equipment;
DROP POLICY IF EXISTS "Users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update their own equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can update equipment" ON equipment;
DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update equipment they added" ON equipment;

-- Create comprehensive policies for equipment table
CREATE POLICY "Anyone can view equipment" 
ON equipment FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add equipment"
ON equipment FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update equipment they added"
ON equipment FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    added_by_user_id = auth.uid() OR
    added_by_user_id IS NULL
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    added_by_user_id = auth.uid() OR
    added_by_user_id IS NULL
  )
);

-- ====================================================================
-- BAG_EQUIPMENT TABLE POLICIES
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Anyone can view equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users manage own equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can add equipment to their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can update equipment in their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can delete equipment from their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Anyone can view bag equipment" ON bag_equipment;

-- Create comprehensive policies for bag_equipment table
CREATE POLICY "Anyone can view bag equipment" 
ON bag_equipment FOR SELECT 
USING (true);

CREATE POLICY "Users can add equipment to their bags"
ON bag_equipment FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update equipment in their bags"
ON bag_equipment FOR UPDATE
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

CREATE POLICY "Users can delete equipment from their bags"
ON bag_equipment FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
);

-- ====================================================================
-- USER_BAGS TABLE POLICIES
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags;
DROP POLICY IF EXISTS "Anyone can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users manage own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON user_bags;
DROP POLICY IF EXISTS "Anyone can view public bags" ON user_bags;

-- Create comprehensive policies for user_bags table
CREATE POLICY "Anyone can view public bags" 
ON user_bags FOR SELECT 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own bags"
ON user_bags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own bags"
ON user_bags FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bags"
ON user_bags FOR DELETE
USING (user_id = auth.uid());

-- ====================================================================
-- GRANT NECESSARY PERMISSIONS
-- ====================================================================

-- Equipment table permissions
GRANT SELECT ON equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON equipment TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Bag equipment table permissions
GRANT SELECT ON bag_equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;

-- User bags table permissions
GRANT SELECT ON user_bags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON user_bags TO authenticated;

-- ====================================================================
-- VERIFICATION QUERY
-- ====================================================================
-- Run this after migration to verify policies are in place:
--
-- SELECT tablename, policyname, permissive, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('equipment', 'bag_equipment', 'user_bags')
-- ORDER BY tablename, policyname;
--
-- Expected result: Should show all the policies created above
-- ====================================================================