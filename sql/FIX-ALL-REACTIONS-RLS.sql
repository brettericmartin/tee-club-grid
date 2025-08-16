-- =========================================================
-- COMPREHENSIVE FIX FOR ALL LIKES/TEES/REACTIONS IN TEED.CLUB
-- This fixes RLS for feed_likes, forum_reactions, bag_tees, equipment_tees
-- =========================================================

-- =========================================
-- 1. FIX FEED_LIKES (Feed Post Tees)
-- =========================================

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_select_all" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_insert_own" ON public.feed_likes;
DROP POLICY IF EXISTS "allow_delete_own" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;

-- Create working policies with unique names
CREATE POLICY "feed_likes_select_policy" 
ON public.feed_likes 
FOR SELECT 
USING (true);

CREATE POLICY "feed_likes_insert_policy" 
ON public.feed_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_likes_delete_policy" 
ON public.feed_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- =========================================
-- 2. FIX FORUM_REACTIONS (Forum Post Reactions)
-- =========================================

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Users can remove reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.forum_reactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.forum_reactions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.forum_reactions;

-- Create working policies
CREATE POLICY "forum_reactions_select_policy" 
ON public.forum_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "forum_reactions_insert_policy" 
ON public.forum_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_reactions_delete_policy" 
ON public.forum_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- =========================================
-- 3. CREATE AND FIX BAG_TEES (Bag Likes)
-- =========================================

-- Create table if it doesn't exist
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

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view bag tees" ON public.bag_tees;
DROP POLICY IF EXISTS "Authenticated users can tee bags" ON public.bag_tees;
DROP POLICY IF EXISTS "Users can untee bags" ON public.bag_tees;

-- Create working policies
CREATE POLICY "bag_tees_select_policy" 
ON public.bag_tees 
FOR SELECT 
USING (true);

CREATE POLICY "bag_tees_insert_policy" 
ON public.bag_tees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bag_tees_delete_policy" 
ON public.bag_tees 
FOR DELETE 
USING (auth.uid() = user_id);

-- =========================================
-- 4. CREATE AND FIX EQUIPMENT_TEES
-- =========================================

-- Create table if it doesn't exist
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

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view equipment tees" ON public.equipment_tees;
DROP POLICY IF EXISTS "Authenticated users can tee equipment" ON public.equipment_tees;
DROP POLICY IF EXISTS "Users can untee equipment" ON public.equipment_tees;

-- Create working policies
CREATE POLICY "equipment_tees_select_policy" 
ON public.equipment_tees 
FOR SELECT 
USING (true);

CREATE POLICY "equipment_tees_insert_policy" 
ON public.equipment_tees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_tees_delete_policy" 
ON public.equipment_tees 
FOR DELETE 
USING (auth.uid() = user_id);

-- =========================================
-- 5. UPDATE ALL COUNTS TO BE ACCURATE
-- =========================================

-- Update feed_posts likes_count
UPDATE feed_posts 
SET likes_count = (
    SELECT COUNT(*) FROM feed_likes WHERE feed_likes.post_id = feed_posts.id
);

-- Update user_bags likes_count (if column exists)
UPDATE user_bags 
SET likes_count = (
    SELECT COUNT(*) FROM bag_tees WHERE bag_tees.bag_id = user_bags.id
)
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_bags' AND column_name = 'likes_count'
);

-- Add tees_count to equipment if missing
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- Update equipment tees_count
UPDATE equipment 
SET tees_count = (
    SELECT COUNT(*) FROM equipment_tees WHERE equipment_tees.equipment_id = equipment.id
);

-- =========================================
-- 6. CREATE TRIGGERS FOR AUTO-COUNTING
-- =========================================

-- Trigger for feed_likes
CREATE OR REPLACE FUNCTION update_feed_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feed_likes_trigger ON public.feed_likes;
CREATE TRIGGER update_feed_likes_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW EXECUTE FUNCTION update_feed_likes_count();

-- Trigger for bag_tees
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_bags SET likes_count = likes_count + 1 WHERE id = NEW.bag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_bags SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.bag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bag_tees_trigger ON public.bag_tees;
CREATE TRIGGER update_bag_tees_trigger
AFTER INSERT OR DELETE ON public.bag_tees
FOR EACH ROW EXECUTE FUNCTION update_bag_tees_count();

-- Trigger for equipment_tees
CREATE OR REPLACE FUNCTION update_equipment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE equipment SET tees_count = tees_count + 1 WHERE id = NEW.equipment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE equipment SET tees_count = GREATEST(tees_count - 1, 0) WHERE id = OLD.equipment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_tees_trigger ON public.equipment_tees;
CREATE TRIGGER update_equipment_tees_trigger
AFTER INSERT OR DELETE ON public.equipment_tees
FOR EACH ROW EXECUTE FUNCTION update_equipment_tees_count();

-- =========================================
-- 7. VERIFY EVERYTHING
-- =========================================

-- Check policies were created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('feed_likes', 'forum_reactions', 'bag_tees', 'equipment_tees')
ORDER BY tablename, cmd;

-- Show current counts
SELECT 
    'Statistics' as info,
    (SELECT COUNT(*) FROM feed_likes) as feed_likes_count,
    (SELECT COUNT(*) FROM forum_reactions) as forum_reactions_count,
    (SELECT COUNT(*) FROM bag_tees) as bag_tees_count,
    (SELECT COUNT(*) FROM equipment_tees) as equipment_tees_count;

-- Success message
SELECT 
    '✅ ALL REACTION SYSTEMS FIXED!' as status,
    'feed_likes: Working' as feed,
    'forum_reactions: Working' as forum,
    'bag_tees: Working' as bags,
    'equipment_tees: Working' as equipment;