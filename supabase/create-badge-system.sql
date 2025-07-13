-- Badge System Schema for Teed.club
-- This creates a comprehensive badge/achievement system

-- Create badge category enum
DO $$ BEGIN
  CREATE TYPE badge_category AS ENUM (
    'equipment_explorer',
    'social_golfer', 
    'gear_collector',
    'community_contributor',
    'milestone_achievement',
    'special_event'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create badge tier enum
DO $$ BEGIN
  CREATE TYPE badge_tier AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Icon name or emoji
  category badge_category NOT NULL,
  tier badge_tier NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create badge criteria table
CREATE TABLE IF NOT EXISTS badge_criteria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  criteria_type TEXT NOT NULL, -- 'equipment_count', 'tees_received', 'reviews_written', etc.
  threshold INTEGER NOT NULL, -- Numeric threshold to meet
  parameters JSONB DEFAULT '{}', -- Additional parameters like specific brands, categories, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create user badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  progress INTEGER DEFAULT 0, -- Progress towards earning (0-100)
  progress_data JSONB DEFAULT '{}', -- Detailed progress tracking
  is_featured BOOLEAN DEFAULT false, -- User can feature badges on profile
  UNIQUE(user_id, badge_id)
);

-- Create badge notifications table
CREATE TABLE IF NOT EXISTS badge_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_badge_criteria_badge_id ON badge_criteria(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_criteria_type ON badge_criteria(criteria_type);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON user_badges(user_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_badge_notifications_user_id ON badge_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_badge_notifications_created_at ON badge_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Badges policies (public read)
CREATE POLICY "Badges are viewable by everyone" ON badges
  FOR SELECT USING (is_active = true);

-- Badge criteria policies (public read)
CREATE POLICY "Badge criteria viewable by everyone" ON badge_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM badges 
      WHERE badges.id = badge_criteria.badge_id 
      AND badges.is_active = true
    )
  );

-- User badges policies
CREATE POLICY "User badges viewable by everyone" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "Users can update own badge featured status" ON user_badges
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Badge notifications policies
CREATE POLICY "Users can view own notifications" ON badge_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON badge_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert initial badges
INSERT INTO badges (name, description, icon, category, tier, sort_order) VALUES
-- Equipment Explorer badges
('Brand Curious', 'Try equipment from 3 different brands', '🔍', 'equipment_explorer', 'bronze', 1),
('Brand Enthusiast', 'Try equipment from 5 different brands', '🎯', 'equipment_explorer', 'silver', 2),
('Brand Connoisseur', 'Try equipment from 10 different brands', '💎', 'equipment_explorer', 'gold', 3),

-- Social Golfer badges
('Rising Star', 'Receive 10 tees on your bag', '⭐', 'social_golfer', 'bronze', 4),
('Crowd Favorite', 'Receive 50 tees on your bag', '🌟', 'social_golfer', 'silver', 5),
('Tee Legend', 'Receive 100 tees on your bag', '✨', 'social_golfer', 'gold', 6),

-- Gear Collector badges
('Starter Set', 'Add 7 items to your bag', '🏌️', 'gear_collector', 'bronze', 7),
('Full Bag', 'Add 14 items to your bag', '🎒', 'gear_collector', 'silver', 8),
('Premium Collection', 'Own equipment worth over $5,000', '💰', 'gear_collector', 'gold', 9),

-- Community Contributor badges
('First Review', 'Write your first equipment review', '✍️', 'community_contributor', 'bronze', 10),
('Helpful Reviewer', 'Write 5 equipment reviews', '📝', 'community_contributor', 'silver', 11),
('Review Expert', 'Write 10 detailed equipment reviews', '🏆', 'community_contributor', 'gold', 12),
('Photo Enthusiast', 'Upload 10 equipment photos', '📸', 'community_contributor', 'silver', 15),

-- Milestone Achievement badges
('Early Adopter', 'Join Teed.club in the first year', '🚀', 'milestone_achievement', 'platinum', 13),
('Complete Profile', 'Fill out all profile information', '✅', 'milestone_achievement', 'bronze', 14)
ON CONFLICT (name) DO NOTHING;

-- Insert badge criteria
WITH badge_ids AS (
  SELECT id, name FROM badges
)
INSERT INTO badge_criteria (badge_id, criteria_type, threshold, parameters)
SELECT 
  badge_ids.id,
  CASE badge_ids.name
    WHEN 'Brand Curious' THEN 'unique_brands'
    WHEN 'Brand Enthusiast' THEN 'unique_brands'
    WHEN 'Brand Connoisseur' THEN 'unique_brands'
    WHEN 'Rising Star' THEN 'tees_received'
    WHEN 'Crowd Favorite' THEN 'tees_received'
    WHEN 'Tee Legend' THEN 'tees_received'
    WHEN 'Starter Set' THEN 'equipment_count'
    WHEN 'Full Bag' THEN 'equipment_count'
    WHEN 'Premium Collection' THEN 'equipment_value'
    WHEN 'First Review' THEN 'reviews_written'
    WHEN 'Helpful Reviewer' THEN 'reviews_written'
    WHEN 'Review Expert' THEN 'reviews_written'
    WHEN 'Photo Enthusiast' THEN 'photos_uploaded'
    WHEN 'Early Adopter' THEN 'join_date'
    WHEN 'Complete Profile' THEN 'profile_complete'
  END as criteria_type,
  CASE badge_ids.name
    WHEN 'Brand Curious' THEN 3
    WHEN 'Brand Enthusiast' THEN 5
    WHEN 'Brand Connoisseur' THEN 10
    WHEN 'Rising Star' THEN 10
    WHEN 'Crowd Favorite' THEN 50
    WHEN 'Tee Legend' THEN 100
    WHEN 'Starter Set' THEN 7
    WHEN 'Full Bag' THEN 14
    WHEN 'Premium Collection' THEN 5000
    WHEN 'First Review' THEN 1
    WHEN 'Helpful Reviewer' THEN 5
    WHEN 'Review Expert' THEN 10
    WHEN 'Photo Enthusiast' THEN 10
    WHEN 'Early Adopter' THEN 365
    WHEN 'Complete Profile' THEN 100
  END as threshold,
  CASE badge_ids.name
    WHEN 'Early Adopter' THEN '{"within_days": 365}'::jsonb
    ELSE '{}'::jsonb
  END as parameters
FROM badge_ids
WHERE badge_ids.name IN (
  'Brand Curious', 'Brand Enthusiast', 'Brand Connoisseur',
  'Rising Star', 'Crowd Favorite', 'Tee Legend',
  'Starter Set', 'Full Bag', 'Premium Collection',
  'First Review', 'Helpful Reviewer', 'Review Expert',
  'Photo Enthusiast', 'Early Adopter', 'Complete Profile'
)
ON CONFLICT DO NOTHING;

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  badge_name TEXT,
  newly_earned BOOLEAN
) AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_earned BOOLEAN;
BEGIN
  -- Check each active badge
  FOR v_badge IN 
    SELECT b.id, b.name, bc.criteria_type, bc.threshold, bc.parameters
    FROM badges b
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE b.is_active = true
  LOOP
    v_progress := 0;
    v_earned := false;
    
    -- Calculate progress based on criteria type
    CASE v_badge.criteria_type
      WHEN 'equipment_count' THEN
        SELECT COUNT(DISTINCT be.equipment_id) INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'unique_brands' THEN
        SELECT COUNT(DISTINCT e.brand) INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'tees_received' THEN
        SELECT COUNT(*) INTO v_progress
        FROM bag_likes bl
        JOIN user_bags ub ON bl.bag_id = ub.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'reviews_written' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment_reviews
        WHERE user_id = p_user_id;
        
      WHEN 'photos_uploaded' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment_photos
        WHERE user_id = p_user_id;
        
      WHEN 'equipment_value' THEN
        SELECT COALESCE(SUM(e.msrp), 0)::INTEGER INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id;
        
      WHEN 'profile_complete' THEN
        SELECT 
          CASE 
            WHEN p.full_name IS NOT NULL 
              AND p.avatar_url IS NOT NULL 
              AND p.bio IS NOT NULL 
              AND p.location IS NOT NULL 
              AND p.handicap IS NOT NULL 
            THEN 100 
            ELSE 0 
          END INTO v_progress
        FROM profiles p
        WHERE p.id = p_user_id;
        
      WHEN 'join_date' THEN
        SELECT 
          CASE 
            WHEN EXTRACT(EPOCH FROM (NOW() - p.created_at))/86400 <= (v_badge.parameters->>'within_days')::INTEGER
            THEN 100
            ELSE 0
          END INTO v_progress
        FROM profiles p
        WHERE p.id = p_user_id;
    END CASE;
    
    -- Check if badge is earned
    IF v_progress >= v_badge.threshold THEN
      v_earned := true;
      
      -- Insert or update user badge
      INSERT INTO user_badges (user_id, badge_id, progress)
      VALUES (p_user_id, v_badge.id, 100)
      ON CONFLICT (user_id, badge_id) 
      DO UPDATE SET progress = 100
      WHERE user_badges.progress < 100
      RETURNING true INTO newly_earned;
      
      -- Create notification if newly earned
      IF newly_earned THEN
        INSERT INTO badge_notifications (user_id, badge_id)
        VALUES (p_user_id, v_badge.id);
      END IF;
    ELSE
      -- Update progress
      INSERT INTO user_badges (user_id, badge_id, progress)
      VALUES (p_user_id, v_badge.id, LEAST((v_progress * 100 / v_badge.threshold), 99))
      ON CONFLICT (user_id, badge_id) 
      DO UPDATE SET progress = LEAST((v_progress * 100 / v_badge.threshold), 99);
    END IF;
    
    RETURN QUERY SELECT v_badge.id, v_badge.name, COALESCE(newly_earned, false);
  END LOOP;
END;
$$ LANGUAGE plpgsql;