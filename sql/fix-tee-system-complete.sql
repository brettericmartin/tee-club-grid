-- Complete Tee (Like) System Fix
-- Per CLAUDE.md: Platform uses "Tees" instead of "Likes"
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- 1. FIX FEED_LIKES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on feed_likes
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;

-- Create proper policies
CREATE POLICY "Users can view all likes" 
ON public.feed_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like posts" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- ============================================
-- 2. CREATE BAG_TEES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.bag_tees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bag_id UUID NOT NULL REFERENCES public.user_bags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, bag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bag_tees_user ON public.bag_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_tees_bag ON public.bag_tees(bag_id);

-- Enable RLS
ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;

-- Create policies for bag_tees
CREATE POLICY "Users can view all bag tees" 
ON public.bag_tees 
FOR SELECT 
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

-- ============================================
-- 3. CREATE EQUIPMENT_TEES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment_tees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, equipment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_tees_user ON public.equipment_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tees_equipment ON public.equipment_tees(equipment_id);

-- Enable RLS
ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment_tees
CREATE POLICY "Users can view all equipment tees" 
ON public.equipment_tees 
FOR SELECT 
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

-- ============================================
-- 4. ADD TEE COUNT COLUMNS IF MISSING
-- ============================================

-- Add tees_count to user_bags if missing
ALTER TABLE public.user_bags 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- Add tees_count to equipment if missing
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- ============================================
-- 5. CREATE TRIGGER FUNCTIONS FOR AUTO-COUNTING
-- ============================================

-- Function to update feed_posts likes_count
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feed_posts 
        SET likes_count = (
            SELECT COUNT(*) FROM feed_likes WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feed_posts 
        SET likes_count = (
            SELECT COUNT(*) FROM feed_likes WHERE post_id = OLD.post_id
        )
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update bag tees_count
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_bags 
        SET tees_count = (
            SELECT COUNT(*) FROM bag_tees WHERE bag_id = NEW.bag_id
        )
        WHERE id = NEW.bag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_bags 
        SET tees_count = (
            SELECT COUNT(*) FROM bag_tees WHERE bag_id = OLD.bag_id
        )
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
        SET tees_count = (
            SELECT COUNT(*) FROM equipment_tees WHERE equipment_id = NEW.equipment_id
        )
        WHERE id = NEW.equipment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE equipment 
        SET tees_count = (
            SELECT COUNT(*) FROM equipment_tees WHERE equipment_id = OLD.equipment_id
        )
        WHERE id = OLD.equipment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_feed_post_likes_count_trigger ON public.feed_likes;
DROP TRIGGER IF EXISTS update_bag_tees_count_trigger ON public.bag_tees;
DROP TRIGGER IF EXISTS update_equipment_tees_count_trigger ON public.equipment_tees;

-- Create triggers
CREATE TRIGGER update_feed_post_likes_count_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_post_likes_count();

CREATE TRIGGER update_bag_tees_count_trigger
AFTER INSERT OR DELETE ON public.bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

CREATE TRIGGER update_equipment_tees_count_trigger
AFTER INSERT OR DELETE ON public.equipment_tees
FOR EACH ROW
EXECUTE FUNCTION update_equipment_tees_count();

-- ============================================
-- 7. UPDATE EXISTING COUNTS
-- ============================================

-- Update feed_posts likes_count
UPDATE feed_posts 
SET likes_count = (
    SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = feed_posts.id
);

-- Update user_bags tees_count (if any existing data)
UPDATE user_bags 
SET tees_count = (
    SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = user_bags.id
);

-- Update equipment tees_count (if any existing data)
UPDATE equipment 
SET tees_count = (
    SELECT COUNT(*) FROM equipment_tees WHERE equipment_tees.equipment_id = equipment.id
);

-- ============================================
-- 8. VERIFY EVERYTHING
-- ============================================

-- Check all tee-related tables
SELECT 
    'feed_likes' as table_name, 
    COUNT(*) as row_count 
FROM feed_likes
UNION ALL
SELECT 
    'bag_tees', 
    COUNT(*) 
FROM bag_tees
UNION ALL
SELECT 
    'equipment_tees', 
    COUNT(*) 
FROM equipment_tees;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'bag_tees', 'equipment_tees')
ORDER BY tablename, cmd;

-- Success message
SELECT '✅ Tee system successfully configured!' as status,
       'Tables created: bag_tees, equipment_tees' as tables,
       'RLS policies: Enabled for all tee tables' as policies,
       'Triggers: Auto-counting enabled' as triggers;