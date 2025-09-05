-- FIX TEE SYSTEM SQL
-- Run this in your Supabase SQL editor

-- 1. Fix RLS policies for feed_likes
DROP POLICY IF EXISTS "Users can view all feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON feed_likes;
DROP POLICY IF EXISTS "Public can view feed likes" ON feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON feed_likes;

-- Enable RLS
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view feed likes" 
  ON feed_likes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can like posts" 
  ON feed_likes FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" 
  ON feed_likes FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix RLS policies for bag_tees
DROP POLICY IF EXISTS "Public can view bag tees" ON bag_tees;
DROP POLICY IF EXISTS "Authenticated users can tee bags" ON bag_tees;
DROP POLICY IF EXISTS "Users can untee bags" ON bag_tees;

-- Enable RLS
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view bag tees" 
  ON bag_tees FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can tee bags" 
  ON bag_tees FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee bags" 
  ON bag_tees FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Fix RLS policies for equipment_tees
DROP POLICY IF EXISTS "Public can view equipment tees" ON equipment_tees;
DROP POLICY IF EXISTS "Authenticated users can tee equipment" ON equipment_tees;
DROP POLICY IF EXISTS "Users can untee equipment" ON equipment_tees;

-- Enable RLS
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view equipment tees" 
  ON equipment_tees FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can tee equipment" 
  ON equipment_tees FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee equipment" 
  ON equipment_tees FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create/Update trigger for feed_likes count
CREATE OR REPLACE FUNCTION update_feed_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_feed_likes_count_trigger ON feed_likes;

-- Create trigger for feed_likes
CREATE TRIGGER update_feed_likes_count_trigger
AFTER INSERT OR DELETE ON feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_likes_count();

-- 5. Create/Update trigger for bag_tees count
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_bags 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.bag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_bags 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.bag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_bag_tees_count_trigger ON bag_tees;

-- Create trigger for bag_tees
CREATE TRIGGER update_bag_tees_count_trigger
AFTER INSERT OR DELETE ON bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

-- 6. Create/Update trigger for equipment_tees count
-- First add tees_count column to equipment if it doesn't exist
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_equipment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment 
    SET tees_count = COALESCE(tees_count, 0) + 1 
    WHERE id = NEW.equipment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment 
    SET tees_count = GREATEST(COALESCE(tees_count, 0) - 1, 0) 
    WHERE id = OLD.equipment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists  
DROP TRIGGER IF EXISTS update_equipment_tees_count_trigger ON equipment_tees;

-- Create trigger for equipment_tees
CREATE TRIGGER update_equipment_tees_count_trigger
AFTER INSERT OR DELETE ON equipment_tees
FOR EACH ROW
EXECUTE FUNCTION update_equipment_tees_count();

-- 7. Sync current counts
-- Update feed posts likes count
UPDATE feed_posts fp
SET likes_count = (
  SELECT COUNT(*) 
  FROM feed_likes fl 
  WHERE fl.post_id = fp.id
);

-- Update bag tees count
UPDATE user_bags ub
SET likes_count = (
  SELECT COUNT(*) 
  FROM bag_tees bt 
  WHERE bt.bag_id = ub.id
);

-- Update equipment tees count
UPDATE equipment e
SET tees_count = (
  SELECT COUNT(*) 
  FROM equipment_tees et 
  WHERE et.equipment_id = e.id
);

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON feed_likes TO authenticated;
GRANT ALL ON bag_tees TO authenticated;
GRANT ALL ON equipment_tees TO authenticated;

-- Test the system
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Check feed_likes
  SELECT COUNT(*) INTO test_count FROM feed_likes;
  RAISE NOTICE 'feed_likes has % records', test_count;
  
  -- Check bag_tees
  SELECT COUNT(*) INTO test_count FROM bag_tees;
  RAISE NOTICE 'bag_tees has % records', test_count;
  
  -- Check equipment_tees
  SELECT COUNT(*) INTO test_count FROM equipment_tees;
  RAISE NOTICE 'equipment_tees has % records', test_count;
  
  RAISE NOTICE 'Tee system fix complete!';
END $$;