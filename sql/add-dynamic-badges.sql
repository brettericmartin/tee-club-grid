-- Add is_dynamic column to badges table
ALTER TABLE badges 
ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT false;

-- Add rarity column for visual distinction
DO $$ BEGIN
  CREATE TYPE badge_rarity AS ENUM (
    'common',
    'uncommon', 
    'rare',
    'epic',
    'legendary'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE badges 
ADD COLUMN IF NOT EXISTS rarity badge_rarity DEFAULT 'common';

-- Update existing badges to set dynamic status
UPDATE badges SET is_dynamic = true WHERE name IN (
  'Brand Curious', 'Brand Enthusiast', 'Brand Connoisseur',
  'Starter Set', 'Full Bag', 'Premium Collection'
);

-- Update Early Adopter badge to include all current users
UPDATE badge_criteria
SET threshold = 36500, -- 100 years, effectively all users
    parameters = '{"within_days": 36500}'::jsonb
WHERE badge_id = (SELECT id FROM badges WHERE name = 'Early Adopter');

-- Insert brand-specific badges
INSERT INTO badges (name, description, icon, category, tier, rarity, sort_order, is_dynamic) VALUES
-- Major Manufacturers
('Titleist Owner', 'Own equipment from Titleist', '⚪', 'gear_collector', 'bronze', 'common', 100, true),
('TaylorMade Owner', 'Own equipment from TaylorMade', '🔴', 'gear_collector', 'bronze', 'common', 101, true),
('Callaway Owner', 'Own equipment from Callaway', '⚡', 'gear_collector', 'bronze', 'common', 102, true),
('Ping Owner', 'Own equipment from Ping', '🎯', 'gear_collector', 'bronze', 'common', 103, true),
('Cobra Owner', 'Own equipment from Cobra', '🐍', 'gear_collector', 'bronze', 'common', 104, true),
('Mizuno Owner', 'Own equipment from Mizuno', '🌊', 'gear_collector', 'bronze', 'common', 105, true),
('Srixon Owner', 'Own equipment from Srixon', '⭐', 'gear_collector', 'bronze', 'common', 106, true),
('Cleveland Owner', 'Own equipment from Cleveland', '🔶', 'gear_collector', 'bronze', 'common', 107, true),
('Wilson Owner', 'Own equipment from Wilson', '🎾', 'gear_collector', 'bronze', 'common', 108, true),
('PXG Owner', 'Own equipment from PXG', '⚫', 'gear_collector', 'bronze', 'uncommon', 109, true),

-- Premium Putter Brands
('Scotty Cameron Owner', 'Own a Scotty Cameron putter', '👑', 'gear_collector', 'bronze', 'rare', 110, true),
('Odyssey Owner', 'Own an Odyssey putter', '🌟', 'gear_collector', 'bronze', 'common', 111, true),
('Bettinardi Owner', 'Own a Bettinardi putter', '🐝', 'gear_collector', 'bronze', 'rare', 112, true),
('Evnroll Owner', 'Own an Evnroll putter', '🎲', 'gear_collector', 'bronze', 'uncommon', 113, true),
('L.A.B. Owner', 'Own a L.A.B. putter', '🔬', 'gear_collector', 'bronze', 'uncommon', 114, true),

-- Other Equipment Brands
('Honma Owner', 'Own equipment from Honma', '🌸', 'gear_collector', 'bronze', 'rare', 115, true),
('Bridgestone Owner', 'Own equipment from Bridgestone', '🏁', 'gear_collector', 'bronze', 'common', 116, true),
('Tour Edge Owner', 'Own equipment from Tour Edge', '🚀', 'gear_collector', 'bronze', 'common', 117, true),
('XXIO Owner', 'Own equipment from XXIO', '💫', 'gear_collector', 'bronze', 'uncommon', 118, true),
('Miura Owner', 'Own equipment from Miura', '⚔️', 'gear_collector', 'bronze', 'epic', 119, true),
('Ben Hogan Owner', 'Own equipment from Ben Hogan', '🏌️', 'gear_collector', 'bronze', 'uncommon', 120, true),

-- Ball Brands
('Vice Owner', 'Own Vice golf balls', '🔵', 'gear_collector', 'bronze', 'common', 121, true),
('Snell Owner', 'Own Snell golf balls', '⚡', 'gear_collector', 'bronze', 'uncommon', 122, true),
('OnCore Owner', 'Own OnCore golf balls', '🎯', 'gear_collector', 'bronze', 'uncommon', 123, true),
('Maxfli Owner', 'Own Maxfli golf balls', '🟡', 'gear_collector', 'bronze', 'common', 124, true),

-- Accessory Brands
('FootJoy Owner', 'Own FootJoy equipment', '👟', 'gear_collector', 'bronze', 'common', 125, true),
('Bushnell Owner', 'Own a Bushnell rangefinder', '📡', 'gear_collector', 'bronze', 'common', 126, true),
('Garmin Owner', 'Own a Garmin device', '📍', 'gear_collector', 'bronze', 'common', 127, true),
('SkyCaddie Owner', 'Own a SkyCaddie device', '🛰️', 'gear_collector', 'bronze', 'common', 128, true),
('Pride Owner', 'Own Pride tees', '🏳️', 'gear_collector', 'bronze', 'common', 129, true),
('Zero Friction Owner', 'Own Zero Friction equipment', '⚙️', 'gear_collector', 'bronze', 'common', 130, true),

-- Legacy Brands
('Nike Owner', 'Own Nike golf equipment', '✓', 'gear_collector', 'bronze', 'uncommon', 131, true),
('Adams Owner', 'Own Adams golf equipment', '🅰️', 'gear_collector', 'bronze', 'uncommon', 132, true)
ON CONFLICT (name) DO NOTHING;

-- Insert badge criteria for all brand badges
WITH brand_badges AS (
  SELECT id, name FROM badges 
  WHERE name LIKE '% Owner' 
  AND name != 'Brand Loyalist'
)
INSERT INTO badge_criteria (badge_id, criteria_type, threshold, parameters)
SELECT 
  bb.id,
  'brand_equipment' as criteria_type,
  1 as threshold,
  json_build_object('brand', REPLACE(bb.name, ' Owner', ''))::jsonb as parameters
FROM brand_badges bb
ON CONFLICT DO NOTHING;

-- Create function for retroactive badge checking
CREATE OR REPLACE FUNCTION check_and_award_badges_for_all_users(
  p_badge_category badge_category DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  badges_awarded INTEGER,
  badges_updated INTEGER
) AS $$
DECLARE
  v_user RECORD;
  v_result RECORD;
  v_badges_awarded INTEGER;
  v_badges_updated INTEGER;
  v_user_count INTEGER := 0;
BEGIN
  -- Loop through all users or limited set
  FOR v_user IN 
    SELECT p.id 
    FROM profiles p
    ORDER BY p.created_at
    LIMIT p_limit
  LOOP
    v_badges_awarded := 0;
    v_badges_updated := 0;
    
    -- Check badges for this user
    FOR v_result IN 
      SELECT * FROM check_and_award_badges(v_user.id)
    LOOP
      IF v_result.newly_earned THEN
        v_badges_awarded := v_badges_awarded + 1;
      ELSE
        v_badges_updated := v_badges_updated + 1;
      END IF;
    END LOOP;
    
    -- Return results for this user
    RETURN QUERY SELECT v_user.id, v_badges_awarded, v_badges_updated;
    
    v_user_count := v_user_count + 1;
    
    -- Log progress every 100 users
    IF v_user_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % users', v_user_count;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle dynamic badge removal
CREATE OR REPLACE FUNCTION remove_unqualified_dynamic_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  badge_name TEXT,
  was_removed BOOLEAN
) AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_should_have_badge BOOLEAN;
BEGIN
  -- Check each dynamic badge the user has
  FOR v_badge IN 
    SELECT b.id, b.name, bc.criteria_type, bc.threshold, bc.parameters, ub.id as user_badge_id
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.id
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE ub.user_id = p_user_id
    AND b.is_dynamic = true
    AND ub.progress = 100
  LOOP
    v_progress := 0;
    v_should_have_badge := false;
    
    -- Re-check criteria (similar logic to check_and_award_badges)
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
        
      WHEN 'brand_equipment' THEN
        -- Check if user still has equipment from this brand
        SELECT COUNT(*) > 0 INTO v_should_have_badge
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id
        AND e.brand = v_badge.parameters->>'brand';
        
        IF v_should_have_badge THEN
          v_progress := v_badge.threshold;
        END IF;
        
      WHEN 'equipment_value' THEN
        SELECT COALESCE(SUM(e.msrp), 0)::INTEGER INTO v_progress
        FROM bag_equipment be
        JOIN user_bags ub ON be.bag_id = ub.id
        JOIN equipment e ON be.equipment_id = e.id
        WHERE ub.user_id = p_user_id;
    END CASE;
    
    -- If user no longer meets criteria, remove badge
    IF v_progress < v_badge.threshold THEN
      DELETE FROM user_badges WHERE id = v_badge.user_badge_id;
      RETURN QUERY SELECT v_badge.id, v_badge.name, true;
    ELSE
      RETURN QUERY SELECT v_badge.id, v_badge.name, false;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_is_dynamic ON badges(is_dynamic);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);