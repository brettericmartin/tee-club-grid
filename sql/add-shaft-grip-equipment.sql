-- Migration to support shafts and grips as equipment items with photos
-- This maintains backward compatibility while allowing standalone shaft/grip items

-- 1. First, update the equipment table check constraint to allow shaft and grip categories
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_category_check;

ALTER TABLE equipment ADD CONSTRAINT equipment_category_check CHECK (
  category IN (
    'driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter',
    'shaft', 'grip', 'ball', 'bag', 'glove', 'rangefinder', 'gps',
    'tee', 'towel', 'ball_marker', 'divot_tool', 'accessories'
  )
);

-- 2. Add image_url column to shafts table if it doesn't exist
ALTER TABLE shafts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shafts ADD COLUMN IF NOT EXISTS is_stock BOOLEAN DEFAULT false;
ALTER TABLE shafts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'driver'; -- Default category for shafts

-- 3. Add image_url column to grips table if it doesn't exist
ALTER TABLE grips ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE grips ADD COLUMN IF NOT EXISTS is_stock BOOLEAN DEFAULT false;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shafts_brand_model ON shafts(brand, model);
CREATE INDEX IF NOT EXISTS idx_grips_brand_model ON grips(brand, model);

-- 5. Add some popular shafts as equipment items (these can have photos)
INSERT INTO equipment (brand, model, category, msrp, created_at)
VALUES 
  ('Fujikura', 'Ventus Blue', 'shaft', 350, NOW()),
  ('Fujikura', 'Ventus Black', 'shaft', 350, NOW()),
  ('Fujikura', 'Ventus Red', 'shaft', 350, NOW()),
  ('Mitsubishi', 'Tensei AV Blue', 'shaft', 200, NOW()),
  ('Mitsubishi', 'Diamana D+', 'shaft', 300, NOW()),
  ('Project X', 'HZRDUS Smoke', 'shaft', 250, NOW()),
  ('Graphite Design', 'Tour AD DI', 'shaft', 450, NOW()),
  ('Aldila', 'Rogue Black', 'shaft', 175, NOW()),
  ('KBS', 'Tour', 'shaft', 110, NOW()),
  ('True Temper', 'Dynamic Gold', 'shaft', 25, NOW())
ON CONFLICT DO NOTHING;

-- 6. Add some popular grips as equipment items (these can have photos)
INSERT INTO equipment (brand, model, category, msrp, created_at)
VALUES 
  ('Golf Pride', 'MCC Plus4', 'grip', 13, NOW()),
  ('Golf Pride', 'Tour Velvet', 'grip', 8, NOW()),
  ('Golf Pride', 'CP2 Pro', 'grip', 11, NOW()),
  ('Lamkin', 'Crossline', 'grip', 7, NOW()),
  ('Lamkin', 'UTx', 'grip', 10, NOW()),
  ('SuperStroke', 'S-Tech', 'grip', 10, NOW()),
  ('Winn', 'Dri-Tac', 'grip', 9, NOW()),
  ('IOMIC', 'Sticky 2.3', 'grip', 25, NOW())
ON CONFLICT DO NOTHING;

-- 7. Create a view to easily get shaft/grip equipment with their details
CREATE OR REPLACE VIEW shaft_equipment_view AS
SELECT 
  e.id,
  e.brand,
  e.model,
  e.category,
  e.msrp,
  e.image_url,
  e.popularity_score,
  COUNT(DISTINCT ep.id) as photo_count,
  MAX(ep.likes_count) as max_photo_likes
FROM equipment e
LEFT JOIN equipment_photos ep ON e.id = ep.equipment_id
WHERE e.category = 'shaft'
GROUP BY e.id, e.brand, e.model, e.category, e.msrp, e.image_url, e.popularity_score;

CREATE OR REPLACE VIEW grip_equipment_view AS
SELECT 
  e.id,
  e.brand,
  e.model,
  e.category,
  e.msrp,
  e.image_url,
  e.popularity_score,
  COUNT(DISTINCT ep.id) as photo_count,
  MAX(ep.likes_count) as max_photo_likes
FROM equipment e
LEFT JOIN equipment_photos ep ON e.id = ep.equipment_id
WHERE e.category = 'grip'
GROUP BY e.id, e.brand, e.model, e.category, e.msrp, e.image_url, e.popularity_score;

-- 8. Update RLS policies to include new categories
-- Equipment photos should work automatically with the new categories

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Shaft and grip equipment support added successfully!';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '- Add shafts and grips as standalone equipment items';
  RAISE NOTICE '- Upload photos for shafts and grips';
  RAISE NOTICE '- Existing shaft/grip customization options remain unchanged';
END $$;