-- Complete Likes/Tees System Fix SQL
-- Run this directly in Supabase SQL Editor

-- 1. Fix RLS policies on feed_likes table
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can like posts" ON feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON feed_likes;

-- Create new policies
CREATE POLICY "Anyone can view feed likes" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON feed_likes FOR DELETE USING (auth.uid() = user_id);

-- 2. Add tees_count column to feed_posts table
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- Copy likes_count to tees_count for consistency
UPDATE feed_posts SET tees_count = likes_count WHERE likes_count IS NOT NULL;

-- 3. Add tees_count columns to other tables
ALTER TABLE bags ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- 4. Create triggers for auto-updating counts
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = (
      SELECT COUNT(*) FROM feed_likes WHERE post_id = NEW.post_id
    ),
    tees_count = (
      SELECT COUNT(*) FROM feed_likes WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = (
      SELECT COUNT(*) FROM feed_likes WHERE post_id = OLD.post_id
    ),
    tees_count = (
      SELECT COUNT(*) FROM feed_likes WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update bag tees count
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bags 
    SET tees_count = (
      SELECT COUNT(*) FROM bag_tees WHERE bag_id = NEW.bag_id
    )
    WHERE id = NEW.bag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bags 
    SET tees_count = (
      SELECT COUNT(*) FROM bag_tees WHERE bag_id = OLD.bag_id
    )
    WHERE id = OLD.bag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update equipment tees count
CREATE OR REPLACE FUNCTION update_equipment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment 
    SET tees_count = (
      SELECT COUNT(*) FROM equipment_tees WHERE equipment_id = NEW.equipment_id
    )
    WHERE id = NEW.equipment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment 
    SET tees_count = (
      SELECT COUNT(*) FROM equipment_tees WHERE equipment_id = OLD.equipment_id
    )
    WHERE id = OLD.equipment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS feed_likes_count_trigger ON feed_likes;
DROP TRIGGER IF EXISTS bag_tees_count_trigger ON bag_tees;
DROP TRIGGER IF EXISTS equipment_tees_count_trigger ON equipment_tees;

-- Create triggers
CREATE TRIGGER feed_likes_count_trigger
  AFTER INSERT OR DELETE ON feed_likes
  FOR EACH ROW EXECUTE FUNCTION update_feed_post_likes_count();

CREATE TRIGGER bag_tees_count_trigger
  AFTER INSERT OR DELETE ON bag_tees
  FOR EACH ROW EXECUTE FUNCTION update_bag_tees_count();

CREATE TRIGGER equipment_tees_count_trigger
  AFTER INSERT OR DELETE ON equipment_tees
  FOR EACH ROW EXECUTE FUNCTION update_equipment_tees_count();

-- 5. Sync all counts to current data
UPDATE feed_posts 
SET likes_count = (
  SELECT COUNT(*) FROM feed_likes WHERE post_id = feed_posts.id
),
tees_count = (
  SELECT COUNT(*) FROM feed_likes WHERE post_id = feed_posts.id
);

UPDATE bags 
SET tees_count = (
  SELECT COUNT(*) FROM bag_tees WHERE bag_id = bags.id
);

UPDATE equipment 
SET tees_count = (
  SELECT COUNT(*) FROM equipment_tees WHERE equipment_id = equipment.id
);

-- 6. Test the system with a simple query
SELECT 
  'feed_posts' as table_name,
  COUNT(*) as total_rows,
  SUM(likes_count) as total_likes,
  SUM(tees_count) as total_tees
FROM feed_posts
UNION ALL
SELECT 
  'feed_likes' as table_name,
  COUNT(*) as total_rows,
  0 as total_likes,
  0 as total_tees
FROM feed_likes
UNION ALL
SELECT 
  'bag_tees' as table_name,
  COUNT(*) as total_rows,
  0 as total_likes,
  0 as total_tees
FROM bag_tees
UNION ALL
SELECT 
  'equipment_tees' as table_name,
  COUNT(*) as total_rows,
  0 as total_likes,
  0 as total_tees
FROM equipment_tees;