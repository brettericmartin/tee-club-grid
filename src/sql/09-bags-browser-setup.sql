-- Setup for Bags Browser (All bags are public)

-- 1. Create bag_likes table if it doesn't exist (matching your schema)
CREATE TABLE IF NOT EXISTS bag_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bag_id uuid NOT NULL REFERENCES user_bags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, bag_id)
);

-- 2. Create user_follows table if it doesn't exist (matching your schema)
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 3. Enable RLS
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for bag_likes
CREATE POLICY "Anyone can view bag likes" ON bag_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON bag_likes
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create policies for user_follows
CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bag_likes_bag_id ON bag_likes(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_likes_user_id ON bag_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- 7. Check what bags exist
SELECT 
  ub.id,
  ub.name,
  ub.bag_type,
  ub.created_at,
  p.username,
  p.display_name,
  (SELECT COUNT(*) FROM bag_equipment WHERE bag_id = ub.id) as equipment_count,
  (SELECT COUNT(*) FROM bag_likes WHERE bag_id = ub.id) as likes_count
FROM user_bags ub
LEFT JOIN profiles p ON p.id = ub.user_id
ORDER BY ub.created_at DESC;