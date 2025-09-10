-- ====================================================================
-- MASTER RLS POLICIES FOR TEED.CLUB
-- ====================================================================
-- This is the complete, authoritative RLS configuration for ALL tables
-- Run this to fix any RLS issues across the entire database
-- 
-- Last Updated: 2025-01-10
-- Reference: /docs/RLS_REFERENCE_SHEET.md
-- ====================================================================

-- ====================================================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PART 2: PROFILES TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins bypass RLS" ON profiles;

-- Create clean policies
CREATE POLICY "Anyone can view profiles" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ====================================================================
-- PART 3: EQUIPMENT TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment;
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON equipment;
DROP POLICY IF EXISTS "Users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update equipment they added" ON equipment;
DROP POLICY IF EXISTS "Users can update their own equipment" ON equipment;

-- Create clean policies
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
-- PART 4: EQUIPMENT_PHOTOS TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Public can view all equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can add equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can update their own equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can delete their own equipment photos" ON equipment_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON equipment_photos;

-- Create clean policies
CREATE POLICY "Anyone can view equipment photos" 
ON equipment_photos FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can upload photos" 
ON equipment_photos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" 
ON equipment_photos FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
ON equipment_photos FOR DELETE 
USING (auth.uid() = user_id);

-- ====================================================================
-- PART 5: USER_BAGS TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view public bags" ON user_bags;
DROP POLICY IF EXISTS "Anyone can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON user_bags;
DROP POLICY IF EXISTS "Public can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users manage own bags" ON user_bags;

-- Create clean policies
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
-- PART 6: BAG_EQUIPMENT TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can add equipment to their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can update equipment in their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can delete equipment from their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can manage equipment in their own bags" ON bag_equipment;
DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users manage own equipment" ON bag_equipment;

-- Create clean policies
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
-- PART 7: FEED_POSTS TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view posts" ON feed_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON feed_posts;

-- Create clean policies
CREATE POLICY "Anyone can view posts" 
ON feed_posts FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON feed_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON feed_posts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON feed_posts FOR DELETE 
USING (auth.uid() = user_id);

-- ====================================================================
-- PART 8: FEED_LIKES TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view likes" ON feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON feed_likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON feed_likes;
DROP POLICY IF EXISTS "Users can unlike their own" ON feed_likes;

-- Create clean policies
CREATE POLICY "Anyone can view likes" 
ON feed_likes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like posts" 
ON feed_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
ON feed_likes FOR DELETE 
USING (auth.uid() = user_id);

-- ====================================================================
-- PART 9: USER_FOLLOWS TABLE
-- ====================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON user_follows;

-- Create clean policies
CREATE POLICY "Anyone can view follows" 
ON user_follows FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can follow" 
ON user_follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow" 
ON user_follows FOR DELETE 
USING (auth.uid() = follower_id);

-- ====================================================================
-- PART 10: TEES TABLES (IF THEY EXIST)
-- ====================================================================

-- Equipment Tees
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_tees') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view tees" ON equipment_tees;
    DROP POLICY IF EXISTS "Users can tee equipment" ON equipment_tees;
    DROP POLICY IF EXISTS "Users can untee equipment" ON equipment_tees;
    
    -- Create policies
    CREATE POLICY "Anyone can view tees" 
    ON equipment_tees FOR SELECT 
    USING (true);
    
    CREATE POLICY "Users can tee equipment" 
    ON equipment_tees FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can untee equipment" 
    ON equipment_tees FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Bag Tees
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_tees') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view bag tees" ON bag_tees;
    DROP POLICY IF EXISTS "Users can tee bags" ON bag_tees;
    DROP POLICY IF EXISTS "Users can untee bags" ON bag_tees;
    
    -- Create policies
    CREATE POLICY "Anyone can view bag tees" 
    ON bag_tees FOR SELECT 
    USING (true);
    
    CREATE POLICY "Users can tee bags" 
    ON bag_tees FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can untee bags" 
    ON bag_tees FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ====================================================================
-- PART 11: VIDEO TABLES (IF THEY EXIST)
-- ====================================================================

-- User Bag Videos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bag_videos') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view videos from accessible bags" ON user_bag_videos;
    DROP POLICY IF EXISTS "Users can insert videos to their bags" ON user_bag_videos;
    DROP POLICY IF EXISTS "Users can update their own videos" ON user_bag_videos;
    DROP POLICY IF EXISTS "Users can delete their own videos" ON user_bag_videos;
    
    -- Create policies
    CREATE POLICY "Users can view videos from accessible bags" 
    ON user_bag_videos FOR SELECT 
    USING (
      auth.uid() = user_id
      OR share_to_feed = true
      OR EXISTS (
        SELECT 1 FROM user_bags 
        WHERE user_bags.id = user_bag_videos.bag_id 
        AND (user_bags.user_id = auth.uid() OR user_bags.is_public = true)
      )
    );
    
    CREATE POLICY "Users can insert videos to their bags" 
    ON user_bag_videos FOR INSERT 
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_bags 
        WHERE user_bags.id = bag_id 
        AND user_bags.user_id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can update their own videos" 
    ON user_bag_videos FOR UPDATE 
    USING (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_bags 
        WHERE user_bags.id = user_bag_videos.bag_id 
        AND user_bags.user_id = auth.uid()
      )
    )
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_bags 
        WHERE user_bags.id = bag_id 
        AND user_bags.user_id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can delete their own videos" 
    ON user_bag_videos FOR DELETE 
    USING (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_bags 
        WHERE user_bags.id = user_bag_videos.bag_id 
        AND user_bags.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Equipment Videos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_videos') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;
    DROP POLICY IF EXISTS "Authenticated users add videos" ON equipment_videos;
    DROP POLICY IF EXISTS "Users update their own videos" ON equipment_videos;
    DROP POLICY IF EXISTS "Users delete their own videos" ON equipment_videos;
    
    -- Create policies
    CREATE POLICY "Anyone can view equipment videos" 
    ON equipment_videos FOR SELECT 
    USING (true);
    
    CREATE POLICY "Authenticated users add videos" 
    ON equipment_videos FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users update their own videos" 
    ON equipment_videos FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users delete their own videos" 
    ON equipment_videos FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ====================================================================
-- PART 12: FORUM TABLES (IF THEY EXIST)
-- ====================================================================

-- Forum Categories
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_categories') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Forum categories are viewable by everyone" ON forum_categories;
    
    -- Create policies
    CREATE POLICY "Forum categories are viewable by everyone" 
    ON forum_categories FOR SELECT 
    USING (true);
  END IF;
END $$;

-- Forum Threads
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_threads') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Forum threads are viewable by everyone" ON forum_threads;
    DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
    DROP POLICY IF EXISTS "Users can update their own threads" ON forum_threads;
    DROP POLICY IF EXISTS "Users can delete their own threads" ON forum_threads;
    
    -- Create policies
    CREATE POLICY "Forum threads are viewable by everyone" 
    ON forum_threads FOR SELECT 
    USING (true);
    
    CREATE POLICY "Authenticated users can create threads" 
    ON forum_threads FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Users can update their own threads" 
    ON forum_threads FOR UPDATE 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own threads" 
    ON forum_threads FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Forum Posts
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON forum_posts;
    DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
    DROP POLICY IF EXISTS "Users can update their own posts" ON forum_posts;
    DROP POLICY IF EXISTS "Users can delete their own posts" ON forum_posts;
    
    -- Create policies
    CREATE POLICY "Forum posts are viewable by everyone" 
    ON forum_posts FOR SELECT 
    USING (true);
    
    CREATE POLICY "Authenticated users can create posts" 
    ON forum_posts FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Users can update their own posts" 
    ON forum_posts FOR UPDATE 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own posts" 
    ON forum_posts FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ====================================================================
-- PART 13: ADMIN TABLES (IF THEY EXIST)
-- ====================================================================

-- Waitlist Applications
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist_applications') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can submit application" ON waitlist_applications;
    DROP POLICY IF EXISTS "Users can view own applications" ON waitlist_applications;
    DROP POLICY IF EXISTS "Only admins can update" ON waitlist_applications;
    DROP POLICY IF EXISTS "Only admins can delete" ON waitlist_applications;
    
    -- Create policies
    CREATE POLICY "Anyone can submit application" 
    ON waitlist_applications FOR INSERT 
    WITH CHECK (true);
    
    CREATE POLICY "Users can view own applications" 
    ON waitlist_applications FOR SELECT 
    USING (
      auth.jwt() ->> 'email' = email
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
    
    CREATE POLICY "Only admins can update" 
    ON waitlist_applications FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
    
    CREATE POLICY "Only admins can delete" 
    ON waitlist_applications FOR DELETE 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- Invite Codes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_codes') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users see their codes" ON invite_codes;
    DROP POLICY IF EXISTS "Users with quota can create" ON invite_codes;
    DROP POLICY IF EXISTS "Codes can be marked used" ON invite_codes;
    
    -- Create policies
    CREATE POLICY "Users see their codes" 
    ON invite_codes FOR SELECT 
    USING (
      created_by = auth.uid()
      OR used_by = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
    
    CREATE POLICY "Users with quota can create" 
    ON invite_codes FOR INSERT 
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND invites_sent < invite_quota
      )
    );
    
    CREATE POLICY "Codes can be marked used" 
    ON invite_codes FOR UPDATE 
    USING (code_status = 'pending' AND auth.uid() IS NOT NULL)
    WITH CHECK (code_status = 'used' AND used_by = auth.uid());
  END IF;
END $$;

-- Equipment Saves
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_saves') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view saves" ON equipment_saves;
    DROP POLICY IF EXISTS "Users can save equipment" ON equipment_saves;
    DROP POLICY IF EXISTS "Users can unsave equipment" ON equipment_saves;
    
    -- Create policies
    CREATE POLICY "Anyone can view saves" 
    ON equipment_saves FOR SELECT 
    USING (true);
    
    CREATE POLICY "Users can save equipment" 
    ON equipment_saves FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can unsave equipment" 
    ON equipment_saves FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Link Clicks
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'link_clicks') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users see own click data" ON link_clicks;
    DROP POLICY IF EXISTS "System records clicks" ON link_clicks;
    
    -- Create policies
    CREATE POLICY "Users see own click data" 
    ON link_clicks FOR SELECT 
    USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
    
    CREATE POLICY "System records clicks" 
    ON link_clicks FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ====================================================================
-- PART 14: GRANT PERMISSIONS
-- ====================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Core tables - everyone can read, authenticated can modify
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;

GRANT SELECT ON equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON equipment TO authenticated;

GRANT SELECT ON equipment_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON equipment_photos TO authenticated;

GRANT SELECT ON user_bags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON user_bags TO authenticated;

GRANT SELECT ON bag_equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;

GRANT SELECT ON feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON feed_posts TO authenticated;

GRANT SELECT ON feed_likes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON feed_likes TO authenticated;

GRANT SELECT ON user_follows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON user_follows TO authenticated;

-- Grant sequence permissions for auto-incrementing IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ====================================================================
-- PART 15: VERIFICATION QUERIES
-- ====================================================================

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  v_table_count INTEGER;
  v_rls_enabled_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_rls_enabled_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ MASTER RLS POLICIES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total tables: %', v_table_count;
  RAISE NOTICE 'Tables with RLS enabled: %', v_rls_enabled_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Run the verification script to test functionality:';
  RAISE NOTICE 'node scripts/verify-all-rls.js';
  RAISE NOTICE '';
END $$;

-- Show policy summary
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ====================================================================
-- END OF MASTER RLS POLICIES
-- ====================================================================