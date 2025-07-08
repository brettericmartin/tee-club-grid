-- Fix Bags Browser Issues

-- 1. First, let's check if is_public column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_bags' 
  AND column_name = 'is_public';

-- 2. If it doesn't exist, add it (uncomment to run)
-- ALTER TABLE user_bags 
-- ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- 3. Update existing bags to be public by default
UPDATE user_bags 
SET is_public = true 
WHERE is_public IS NULL;

-- 4. Check what bags we have
SELECT 
  ub.id,
  ub.name,
  ub.user_id,
  ub.is_public,
  ub.created_at,
  p.username,
  p.full_name,
  (SELECT COUNT(*) FROM bag_equipment WHERE bag_id = ub.id) as equipment_count
FROM user_bags ub
LEFT JOIN profiles p ON p.id = ub.user_id
ORDER BY ub.created_at DESC;

-- 5. Create some sample public bags if none exist
DO $$
DECLARE
  sample_user_id uuid;
  sample_bag_id uuid;
  equipment_ids uuid[];
BEGIN
  -- Get a user to create bags for (or create one)
  SELECT id INTO sample_user_id FROM profiles LIMIT 1;
  
  IF sample_user_id IS NULL THEN
    -- Create a sample user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'demo@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now()
    ) RETURNING id INTO sample_user_id;
    
    INSERT INTO profiles (id, username, full_name)
    VALUES (sample_user_id, 'demo_player', 'Demo Player');
  END IF;
  
  -- Check if this user already has bags
  SELECT id INTO sample_bag_id FROM user_bags WHERE user_id = sample_user_id LIMIT 1;
  
  IF sample_bag_id IS NULL THEN
    -- Create a sample bag
    INSERT INTO user_bags (user_id, name, bag_type, is_public, description)
    VALUES (
      sample_user_id,
      'Demo Tournament Bag',
      'tournament',
      true,
      'My setup for tournament play'
    ) RETURNING id INTO sample_bag_id;
    
    -- Get some equipment IDs
    SELECT array_agg(id) INTO equipment_ids 
    FROM equipment 
    WHERE category IN ('driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter')
    LIMIT 14;
    
    -- Add equipment to the bag
    IF array_length(equipment_ids, 1) > 0 THEN
      INSERT INTO bag_equipment (bag_id, equipment_id, condition)
      SELECT sample_bag_id, unnest(equipment_ids), 'new';
    END IF;
  END IF;
END $$;

-- 6. Create bag_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS bag_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bag_id uuid NOT NULL REFERENCES user_bags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, bag_id)
);

-- 7. Create user_follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 8. Enable RLS
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 9. Create policies
CREATE POLICY "Anyone can view bag likes" ON bag_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON bag_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);