-- =================================================
-- COMPLETE TEE SYSTEM FIX FOR TEED.CLUB
-- Per CLAUDE.md: Platform uses "Tees" instead of "Likes"
-- Run this ENTIRE script in Supabase Dashboard > SQL Editor
-- =================================================

-- ============================================
-- STEP 1: FIX FEED_LIKES TABLE & RLS
-- ============================================

-- Enable RLS on feed_likes
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.feed_likes;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.feed_likes;

-- Create correct policies
CREATE POLICY "Anyone can view feed likes" 
ON public.feed_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add likes" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 2: CREATE BAG_TEES TABLE (renamed from bag_likes)
-- ============================================

-- Drop old table if exists (bag_likes was wrong name)
DROP TABLE IF EXISTS public.bag_likes CASCADE;

-- Create bag_tees table
CREATE TABLE IF NOT EXISTS public.bag_tees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bag_id UUID NOT NULL REFERENCES public.user_bags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, bag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bag_tees_user ON public.bag_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_tees_bag ON public.bag_tees(bag_id);

-- Enable RLS
ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view bag tees" ON public.bag_tees;
DROP POLICY IF EXISTS "Authenticated users can tee bags" ON public.bag_tees;
DROP POLICY IF EXISTS "Users can untee bags" ON public.bag_tees;

CREATE POLICY "Anyone can view bag tees" 
ON public.bag_tees 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can tee bags" 
ON public.bag_tees 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee bags" 
ON public.bag_tees 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: CREATE EQUIPMENT_TEES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment_tees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, equipment_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_tees_user ON public.equipment_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tees_equipment ON public.equipment_tees(equipment_id);

-- Enable RLS
ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view equipment tees" ON public.equipment_tees;
DROP POLICY IF EXISTS "Authenticated users can tee equipment" ON public.equipment_tees;
DROP POLICY IF EXISTS "Users can untee equipment" ON public.equipment_tees;

CREATE POLICY "Anyone can view equipment tees" 
ON public.equipment_tees 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can tee equipment" 
ON public.equipment_tees 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee equipment" 
ON public.equipment_tees 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: ENSURE TEES_COUNT COLUMNS EXIST
-- ============================================

-- Note: user_bags already has likes_count, we'll use that
-- Add tees_count to equipment if missing
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- ============================================
-- STEP 5: CREATE AUTO-UPDATE FUNCTIONS
-- ============================================

-- Function to update feed_posts likes_count
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feed_posts 
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feed_posts 
        SET likes_count = GREATEST(COALESCE(likes_count, 1) - 1, 0)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update bag likes_count (using existing column)
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_bags 
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.bag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_bags 
        SET likes_count = GREATEST(COALESCE(likes_count, 1) - 1, 0)
        WHERE id = OLD.bag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update equipment tees_count
CREATE OR REPLACE FUNCTION update_equipment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE equipment 
        SET tees_count = COALESCE(tees_count, 0) + 1
        WHERE id = NEW.equipment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE equipment 
        SET tees_count = GREATEST(COALESCE(tees_count, 1) - 1, 0)
        WHERE id = OLD.equipment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_feed_post_likes_trigger ON public.feed_likes;
DROP TRIGGER IF EXISTS update_bag_tees_trigger ON public.bag_tees;
DROP TRIGGER IF EXISTS update_equipment_tees_trigger ON public.equipment_tees;

-- Create new triggers
CREATE TRIGGER update_feed_post_likes_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_post_likes_count();

CREATE TRIGGER update_bag_tees_trigger
AFTER INSERT OR DELETE ON public.bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

CREATE TRIGGER update_equipment_tees_trigger
AFTER INSERT OR DELETE ON public.equipment_tees
FOR EACH ROW
EXECUTE FUNCTION update_equipment_tees_count();

-- ============================================
-- STEP 7: RECALCULATE ALL COUNTS
-- ============================================

-- Update feed_posts likes_count
UPDATE feed_posts 
SET likes_count = (
    SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = feed_posts.id
);

-- Update user_bags likes_count
UPDATE user_bags 
SET likes_count = (
    SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = user_bags.id
);

-- Update equipment tees_count
UPDATE equipment 
SET tees_count = (
    SELECT COUNT(*) FROM equipment_tees WHERE equipment_tees.equipment_id = equipment.id
);

-- ============================================
-- STEP 8: VERIFY SETUP
-- ============================================

-- Check tables exist
SELECT 
    'Tables Created' as check_type,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_likes') as feed_likes,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_tees') as bag_tees,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_tees') as equipment_tees;

-- Check RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname IN ('feed_likes', 'bag_tees', 'equipment_tees');

-- Count policies
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'bag_tees', 'equipment_tees')
GROUP BY tablename
ORDER BY tablename;

-- Show current counts
SELECT 
    'Current Tee Counts' as summary,
    (SELECT COUNT(*) FROM feed_likes) as feed_tees,
    (SELECT COUNT(*) FROM bag_tees) as bag_tees,
    (SELECT COUNT(*) FROM equipment_tees) as equipment_tees;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 
    '✅ TEE SYSTEM SUCCESSFULLY CONFIGURED!' as status,
    'All tables created with proper RLS' as details,
    'Auto-counting triggers installed' as triggers,
    'Ready for teeing!' as message;