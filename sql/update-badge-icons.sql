-- Update badge icons to use generated SVG files
UPDATE badges SET icon = '/badges/rising-star.svg' WHERE name = 'Rising Star';
UPDATE badges SET icon = '/badges/crowd-favorite.svg' WHERE name = 'Crowd Favorite';
UPDATE badges SET icon = '/badges/tee-legend.svg' WHERE name = 'Tee Legend';
UPDATE badges SET icon = '/badges/first-review.svg' WHERE name = 'First Review';
UPDATE badges SET icon = '/badges/helpful-reviewer.svg' WHERE name = 'Helpful Reviewer';
UPDATE badges SET icon = '/badges/review-expert.svg' WHERE name = 'Review Expert';
UPDATE badges SET icon = '/badges/photo-enthusiast.svg' WHERE name = 'Photo Enthusiast';
UPDATE badges SET icon = '/badges/early-adopter.svg' WHERE name = 'Early Adopter';
UPDATE badges SET icon = '/badges/complete-profile.svg' WHERE name = 'Complete Profile';
UPDATE badges SET icon = '/badges/brand-curious.svg' WHERE name = 'Brand Curious';
UPDATE badges SET icon = '/badges/brand-enthusiast.svg' WHERE name = 'Brand Enthusiast';
UPDATE badges SET icon = '/badges/brand-connoisseur.svg' WHERE name = 'Brand Connoisseur';
UPDATE badges SET icon = '/badges/starter-set.svg' WHERE name = 'Starter Set';
UPDATE badges SET icon = '/badges/full-bag.svg' WHERE name = 'Full Bag';
UPDATE badges SET icon = '/badges/premium-collection.svg' WHERE name = 'Premium Collection';

-- Brand badges
UPDATE badges SET icon = '/badges/titleist-owner.svg' WHERE name = 'Titleist Owner';
UPDATE badges SET icon = '/badges/taylormade-owner.svg' WHERE name = 'TaylorMade Owner';
UPDATE badges SET icon = '/badges/callaway-owner.svg' WHERE name = 'Callaway Owner';
UPDATE badges SET icon = '/badges/ping-owner.svg' WHERE name = 'Ping Owner';
UPDATE badges SET icon = '/badges/cobra-owner.svg' WHERE name = 'Cobra Owner';
UPDATE badges SET icon = '/badges/mizuno-owner.svg' WHERE name = 'Mizuno Owner';
UPDATE badges SET icon = '/badges/srixon-owner.svg' WHERE name = 'Srixon Owner';
UPDATE badges SET icon = '/badges/cleveland-owner.svg' WHERE name = 'Cleveland Owner';
UPDATE badges SET icon = '/badges/wilson-owner.svg' WHERE name = 'Wilson Owner';
UPDATE badges SET icon = '/badges/pxg-owner.svg' WHERE name = 'PXG Owner';
UPDATE badges SET icon = '/badges/scotty-cameron-owner.svg' WHERE name = 'Scotty Cameron Owner';
UPDATE badges SET icon = '/badges/odyssey-owner.svg' WHERE name = 'Odyssey Owner';
UPDATE badges SET icon = '/badges/bettinardi-owner.svg' WHERE name = 'Bettinardi Owner';
UPDATE badges SET icon = '/badges/evnroll-owner.svg' WHERE name = 'Evnroll Owner';
UPDATE badges SET icon = '/badges/l.a.b.-owner.svg' WHERE name = 'L.A.B. Owner';
UPDATE badges SET icon = '/badges/honma-owner.svg' WHERE name = 'Honma Owner';
UPDATE badges SET icon = '/badges/bridgestone-owner.svg' WHERE name = 'Bridgestone Owner';
UPDATE badges SET icon = '/badges/tour-edge-owner.svg' WHERE name = 'Tour Edge Owner';
UPDATE badges SET icon = '/badges/xxio-owner.svg' WHERE name = 'XXIO Owner';
UPDATE badges SET icon = '/badges/miura-owner.svg' WHERE name = 'Miura Owner';
UPDATE badges SET icon = '/badges/ben-hogan-owner.svg' WHERE name = 'Ben Hogan Owner';
UPDATE badges SET icon = '/badges/vice-owner.svg' WHERE name = 'Vice Owner';
UPDATE badges SET icon = '/badges/snell-owner.svg' WHERE name = 'Snell Owner';
UPDATE badges SET icon = '/badges/oncore-owner.svg' WHERE name = 'OnCore Owner';
UPDATE badges SET icon = '/badges/maxfli-owner.svg' WHERE name = 'Maxfli Owner';
UPDATE badges SET icon = '/badges/footjoy-owner.svg' WHERE name = 'FootJoy Owner';
UPDATE badges SET icon = '/badges/bushnell-owner.svg' WHERE name = 'Bushnell Owner';
UPDATE badges SET icon = '/badges/garmin-owner.svg' WHERE name = 'Garmin Owner';
UPDATE badges SET icon = '/badges/skycaddie-owner.svg' WHERE name = 'SkyCaddie Owner';
UPDATE badges SET icon = '/badges/pride-owner.svg' WHERE name = 'Pride Owner';
UPDATE badges SET icon = '/badges/zero-friction-owner.svg' WHERE name = 'Zero Friction Owner';
UPDATE badges SET icon = '/badges/nike-owner.svg' WHERE name = 'Nike Owner';
UPDATE badges SET icon = '/badges/adams-owner.svg' WHERE name = 'Adams Owner';

-- Add a function to get featured badges with priority
CREATE OR REPLACE FUNCTION get_featured_badges(p_user_id UUID, p_limit INTEGER DEFAULT 6)
RETURNS TABLE (
  user_badge_id UUID,
  badge_id UUID,
  badge_name TEXT,
  badge_icon TEXT,
  badge_rarity badge_rarity,
  is_featured BOOLEAN,
  earned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ub.id as user_badge_id,
    b.id as badge_id,
    b.name as badge_name,
    b.icon as badge_icon,
    b.rarity as badge_rarity,
    ub.is_featured,
    ub.earned_at
  FROM user_badges ub
  JOIN badges b ON ub.badge_id = b.id
  WHERE ub.user_id = p_user_id
  AND ub.progress = 100
  ORDER BY 
    ub.is_featured DESC,  -- Featured first
    CASE b.rarity         -- Then by rarity
      WHEN 'legendary' THEN 1
      WHEN 'epic' THEN 2
      WHEN 'rare' THEN 3
      WHEN 'uncommon' THEN 4
      WHEN 'common' THEN 5
    END,
    b.sort_order,         -- Then by sort order
    ub.earned_at DESC     -- Then by when earned
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;