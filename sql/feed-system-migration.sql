-- Feed System Migration
-- Run this in Supabase SQL Editor

-- 1. Enhanced feed_posts table
-- First, let's check if we need to create or alter
DO $$
BEGIN
  -- Add new columns if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feed_posts') THEN
    -- Add missing columns
    ALTER TABLE feed_posts 
    ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
    
    -- Update type constraint to include new types
    ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;
    ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
      CHECK (type IN ('equipment_photo', 'bag_created', 'bag_updated'));
  ELSE
    -- Create the table fresh
    CREATE TABLE feed_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('equipment_photo', 'bag_created', 'bag_updated')),
      
      -- Common fields
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Photo-specific fields
      image_url TEXT,
      
      -- Bag-specific fields
      bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
      parent_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,
      
      -- Metadata for different post types
      metadata JSONB DEFAULT '{}',
      
      -- Engagement
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      
      -- Validation
      CONSTRAINT valid_post_type CHECK (
        (type = 'equipment_photo' AND image_url IS NOT NULL) OR
        (type IN ('bag_created', 'bag_updated') AND bag_id IS NOT NULL)
      )
    );
  END IF;
END $$;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_id ON feed_posts(bag_id);

-- 3. Feed likes table
CREATE TABLE IF NOT EXISTS feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 4. Feed comments table
CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Equipment photo references table (links photos to equipment)
CREATE TABLE IF NOT EXISTS feed_equipment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, equipment_id)
);

-- 6. Bag updates tracking table
CREATE TABLE IF NOT EXISTS bag_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  update_type TEXT CHECK (update_type IN ('added', 'removed', 'updated')),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Function to update likes count
CREATE OR REPLACE FUNCTION update_feed_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger for likes count
DROP TRIGGER IF EXISTS update_feed_likes_count_trigger ON feed_likes;
CREATE TRIGGER update_feed_likes_count_trigger
AFTER INSERT OR DELETE ON feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_likes_count();

-- 9. Function to handle bag creation posts
CREATE OR REPLACE FUNCTION create_bag_feed_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create post for public bags
  IF NEW.is_public = true THEN
    INSERT INTO feed_posts (user_id, type, bag_id, content, metadata)
    VALUES (
      NEW.user_id,
      'bag_created',
      NEW.id,
      'Created a new bag: ' || NEW.name,
      jsonb_build_object(
        'bag_name', NEW.name,
        'bag_type', NEW.bag_type,
        'total_value', NEW.total_value
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger for new bags
DROP TRIGGER IF EXISTS create_bag_feed_post_trigger ON user_bags;
CREATE TRIGGER create_bag_feed_post_trigger
AFTER INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION create_bag_feed_post();

-- 11. Function to track bag equipment changes
CREATE OR REPLACE FUNCTION track_bag_equipment_changes()
RETURNS TRIGGER AS $$
DECLARE
  bag_created_at TIMESTAMPTZ;
  hours_since_creation INTEGER;
BEGIN
  -- Get bag creation time
  SELECT created_at INTO bag_created_at
  FROM user_bags
  WHERE id = COALESCE(NEW.bag_id, OLD.bag_id);
  
  -- Calculate hours since bag creation
  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - bag_created_at)) / 3600;
  
  IF TG_OP = 'INSERT' THEN
    -- Track equipment addition
    INSERT INTO bag_updates (bag_id, user_id, update_type, equipment_id, metadata)
    VALUES (
      NEW.bag_id,
      (SELECT user_id FROM user_bags WHERE id = NEW.bag_id),
      'added',
      NEW.equipment_id,
      jsonb_build_object('hours_since_bag_creation', hours_since_creation)
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Track equipment removal
    INSERT INTO bag_updates (bag_id, user_id, update_type, equipment_id, metadata)
    VALUES (
      OLD.bag_id,
      (SELECT user_id FROM user_bags WHERE id = OLD.bag_id),
      'removed',
      OLD.equipment_id,
      jsonb_build_object('hours_since_bag_creation', hours_since_creation)
    );
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 12. Trigger for bag equipment changes
DROP TRIGGER IF EXISTS track_bag_equipment_changes_trigger ON bag_equipment;
CREATE TRIGGER track_bag_equipment_changes_trigger
AFTER INSERT OR DELETE ON bag_equipment
FOR EACH ROW
EXECUTE FUNCTION track_bag_equipment_changes();

-- 13. Enable RLS
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_equipment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_updates ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies
-- Feed posts
CREATE POLICY "Feed posts are viewable by everyone" ON feed_posts
  FOR SELECT USING (true);
  
CREATE POLICY "Users can create their own feed posts" ON feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own feed posts" ON feed_posts
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own feed posts" ON feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Feed likes
CREATE POLICY "Feed likes are viewable by everyone" ON feed_likes
  FOR SELECT USING (true);
  
CREATE POLICY "Users can manage their own likes" ON feed_likes
  FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone" ON feed_comments
  FOR SELECT USING (true);
  
CREATE POLICY "Users can create comments" ON feed_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Equipment tags
CREATE POLICY "Equipment tags are viewable by everyone" ON feed_equipment_tags
  FOR SELECT USING (true);
  
CREATE POLICY "Users can tag equipment in their posts" ON feed_equipment_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Bag updates (internal tracking)
CREATE POLICY "Users can view their own bag updates" ON bag_updates
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "System can track all bag updates" ON bag_updates
  FOR ALL USING (true);