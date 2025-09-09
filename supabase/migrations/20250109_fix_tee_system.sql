-- Fix Tee System: Create missing tables and add proper RLS policies

-- Step 1: Create equipment_photo_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS equipment_photo_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid REFERENCES equipment_photos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_photo_likes_photo_id ON equipment_photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_equipment_photo_likes_user_id ON equipment_photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_photo_likes_created_at ON equipment_photo_likes(created_at DESC);

-- Step 2: Add trigger to update likes_count on equipment_photos
CREATE OR REPLACE FUNCTION update_equipment_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment_photos 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment_photos 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS equipment_photo_likes_count_trigger ON equipment_photo_likes;
CREATE TRIGGER equipment_photo_likes_count_trigger
AFTER INSERT OR DELETE ON equipment_photo_likes
FOR EACH ROW
EXECUTE FUNCTION update_equipment_photo_likes_count();

-- Step 3: Add similar trigger for bag_tees
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_bags 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.bag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_bags 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.bag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bag_tees
DROP TRIGGER IF EXISTS bag_tees_count_trigger ON bag_tees;
CREATE TRIGGER bag_tees_count_trigger
AFTER INSERT OR DELETE ON bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

-- Step 4: Add trigger for feed_likes
CREATE OR REPLACE FUNCTION update_feed_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feed_likes
DROP TRIGGER IF EXISTS feed_likes_count_trigger ON feed_likes;
CREATE TRIGGER feed_likes_count_trigger
AFTER INSERT OR DELETE ON feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_likes_count();

-- Step 5: Enable RLS on all tee-related tables
ALTER TABLE equipment_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- Step 6: Equipment Photo Likes RLS Policies
DROP POLICY IF EXISTS "Anyone can view equipment photo likes" ON equipment_photo_likes;
CREATE POLICY "Anyone can view equipment photo likes" ON equipment_photo_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like equipment photos" ON equipment_photo_likes;
CREATE POLICY "Users can like equipment photos" ON equipment_photo_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike equipment photos" ON equipment_photo_likes;
CREATE POLICY "Users can unlike equipment photos" ON equipment_photo_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Bag Tees RLS Policies
DROP POLICY IF EXISTS "Anyone can view bag tees" ON bag_tees;
CREATE POLICY "Anyone can view bag tees" ON bag_tees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can tee bags" ON bag_tees;
CREATE POLICY "Users can tee bags" ON bag_tees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can untee bags" ON bag_tees;
CREATE POLICY "Users can untee bags" ON bag_tees
  FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Feed Likes RLS Policies
DROP POLICY IF EXISTS "Anyone can view feed likes" ON feed_likes;
CREATE POLICY "Anyone can view feed likes" ON feed_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like feed posts" ON feed_likes;
CREATE POLICY "Users can like feed posts" ON feed_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike feed posts" ON feed_likes;
CREATE POLICY "Users can unlike feed posts" ON feed_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create aggregation views for tee counts
-- View for bag total tees (bag tees + all equipment photo tees from that bag)
CREATE OR REPLACE VIEW bag_total_tees AS
SELECT 
  b.id as bag_id,
  b.user_id,
  COALESCE(bt.tee_count, 0) as bag_tees,
  COALESCE(ept.photo_tee_count, 0) as photo_tees,
  COALESCE(bt.tee_count, 0) + COALESCE(ept.photo_tee_count, 0) as total_tees
FROM user_bags b
LEFT JOIN (
  SELECT bag_id, COUNT(*) as tee_count
  FROM bag_tees
  GROUP BY bag_id
) bt ON bt.bag_id = b.id
LEFT JOIN (
  SELECT 
    be.bag_id,
    COUNT(DISTINCT epl.id) as photo_tee_count
  FROM bag_equipment be
  JOIN equipment e ON e.id = be.equipment_id
  JOIN equipment_photos ep ON ep.equipment_id = e.id
  JOIN equipment_photo_likes epl ON epl.photo_id = ep.id
  GROUP BY be.bag_id
) ept ON ept.bag_id = b.id;

-- View for equipment photo with user like status
CREATE OR REPLACE VIEW equipment_photos_with_likes AS
SELECT 
  ep.*,
  CASE 
    WHEN epl.user_id IS NOT NULL THEN true 
    ELSE false 
  END as is_liked_by_user
FROM equipment_photos ep
LEFT JOIN equipment_photo_likes epl 
  ON epl.photo_id = ep.id 
  AND epl.user_id = auth.uid();

-- Step 10: Update existing like counts to be accurate
-- Update equipment_photos likes_count
UPDATE equipment_photos ep
SET likes_count = (
  SELECT COUNT(*) 
  FROM equipment_photo_likes 
  WHERE photo_id = ep.id
);

-- Update user_bags likes_count
UPDATE user_bags ub
SET likes_count = (
  SELECT COUNT(*) 
  FROM bag_tees 
  WHERE bag_id = ub.id
);

-- Update feed_posts likes_count
UPDATE feed_posts fp
SET likes_count = (
  SELECT COUNT(*) 
  FROM feed_likes 
  WHERE post_id = fp.id
);

-- Add comment for documentation
COMMENT ON TABLE equipment_photo_likes IS 'Tracks user likes/tees for equipment photos';
COMMENT ON VIEW bag_total_tees IS 'Aggregated view of total tees for bags including equipment photo tees';
COMMENT ON VIEW equipment_photos_with_likes IS 'Equipment photos with user-specific like status';