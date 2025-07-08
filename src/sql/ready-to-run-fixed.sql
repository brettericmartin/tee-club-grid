-- Ready to Run: Pro Golfer Bags Setup
-- Fixed version - This script is ready to copy and paste into Supabase SQL editor

-- First, let's create a regular function (we'll drop it at the end)
CREATE OR REPLACE FUNCTION get_equipment_id_temp(p_brand TEXT, p_model TEXT, p_category TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try exact match first
  SELECT id INTO v_id
  FROM equipment
  WHERE LOWER(brand) = LOWER(p_brand) 
    AND LOWER(model) LIKE LOWER(p_model) || '%'
    AND category = p_category
  LIMIT 1;
  
  -- If not found, try just brand and category
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM equipment
    WHERE LOWER(brand) = LOWER(p_brand) 
      AND category = p_category
    ORDER BY release_year DESC, model
    LIMIT 1;
  END IF;
  
  -- If still not found, just get any equipment in that category
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM equipment
    WHERE category = p_category
    LIMIT 1;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create all 10 pro bags for user 68cf7bbe-e7d3-4255-a18c-f890766ff77b
DO $$
DECLARE
  v_user_id UUID := '68cf7bbe-e7d3-4255-a18c-f890766ff77b';
  v_bag_id UUID;
BEGIN
  -- Create all 10 pro bags at once
  INSERT INTO user_bags (user_id, name, description, is_public) VALUES
    (v_user_id, 'Rory McIlroy 2024', 'TaylorMade Qi10 tour setup with Ventus shafts', true),
    (v_user_id, 'Scottie Scheffler #1', 'World #1 mixed TaylorMade/Titleist setup', true),
    (v_user_id, 'Jon Rahm Masters', 'Spanish Armada - Full Callaway setup', true),
    (v_user_id, 'Viktor Hovland', 'Norwegian Thunder - PING precision', true),
    (v_user_id, 'Xander Schauffele', 'Olympic Gold winning Callaway clubs', true),
    (v_user_id, 'Collin Morikawa', 'Iron specialist TaylorMade precision', true),
    (v_user_id, 'Justin Thomas', 'JT''s Titleist major championship weapons', true),
    (v_user_id, 'Jordan Spieth', 'Texas Forever - Classic Titleist setup', true),
    (v_user_id, 'Patrick Cantlay', 'Calculated precision with Titleist', true),
    (v_user_id, 'Dustin Johnson', 'DJ''s TaylorMade bombing setup', true);

  -- Populate Rory McIlroy's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
  SELECT 
    b.id,
    get_equipment_id_temp(e.brand, e.model, e.category),
    e.custom_specs,
    e.notes,
    1
  FROM user_bags b
  CROSS JOIN (VALUES
    ('TaylorMade', 'Qi10', 'driver', 'Fujikura Ventus Black 6X, 9°', 'Gamer'),
    ('TaylorMade', 'Qi10', 'fairway_wood', '15° 3-wood', NULL),
    ('TaylorMade', 'Qi10', 'fairway_wood', '19° 5-wood', 'Go-to club'),
    ('TaylorMade', 'P760', 'iron', '4-PW, Project X 7.0', NULL),
    ('TaylorMade', 'MG4', 'wedge', '50° 9 bounce', NULL),
    ('TaylorMade', 'MG4', 'wedge', '54° 11 bounce', NULL),
    ('TaylorMade', 'MG4', 'wedge', '60° 8 bounce', NULL),
    ('TaylorMade', 'Spider Tour', 'putter', '35 inches', 'Red sightline'),
    ('TaylorMade', 'TP5x', 'ball', NULL, '2024 model'),
    ('TaylorMade', 'Tour Staff Bag', 'bag', NULL, NULL),
    ('TaylorMade', 'Tour Preferred', 'glove', 'Size ML', NULL),
    ('Zero Friction', '3-Prong', 'tees', NULL, NULL),
    ('Bushnell', 'Pro X3', 'rangefinder', NULL, NULL)
  ) AS e(brand, model, category, custom_specs, notes)
  WHERE b.user_id = v_user_id 
    AND b.name = 'Rory McIlroy 2024'
    AND get_equipment_id_temp(e.brand, e.model, e.category) IS NOT NULL;

  -- Populate Scottie Scheffler's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
  SELECT 
    b.id,
    get_equipment_id_temp(e.brand, e.model, e.category),
    e.custom_specs,
    e.notes,
    1
  FROM user_bags b
  CROSS JOIN (VALUES
    ('TaylorMade', 'Qi10', 'driver', '8.5°, Ventus TR Black 6X', 'Low spin'),
    ('TaylorMade', 'Stealth 2', 'fairway_wood', '16.5°', NULL),
    ('TaylorMade', 'Stealth 2', 'hybrid', '21°', NULL),
    ('TaylorMade', 'P7TW', 'iron', '4-PW, DG Tour Issue X100', NULL),
    ('Titleist', 'Vokey SM9', 'wedge', '50° F grind', NULL),
    ('Titleist', 'Vokey SM9', 'wedge', '56° S grind', NULL),
    ('Titleist', 'Vokey SM9', 'wedge', '60° L grind', NULL),
    ('Scotty Cameron', 'Phantom X 5', 'putter', '35 inches', NULL),
    ('Titleist', 'Pro V1', 'ball', NULL, 'Left dash'),
    ('Titleist', 'Players 4', 'bag', NULL, NULL),
    ('Titleist', 'Players Flex', 'glove', NULL, NULL)
  ) AS e(brand, model, category, custom_specs, notes)
  WHERE b.user_id = v_user_id 
    AND b.name = 'Scottie Scheffler #1'
    AND get_equipment_id_temp(e.brand, e.model, e.category) IS NOT NULL;

  -- Populate Jon Rahm's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
  SELECT 
    b.id,
    get_equipment_id_temp(e.brand, e.model, e.category),
    e.custom_specs,
    e.notes,
    1
  FROM user_bags b
  CROSS JOIN (VALUES
    ('Callaway', 'Paradym', 'driver', '10.5°, Aldila Tour Green', 'Triple Diamond'),
    ('Callaway', 'Paradym', 'fairway_wood', '15° 3-wood', NULL),
    ('Callaway', 'Paradym', 'fairway_wood', '18° 5-wood', NULL),
    ('Callaway', 'Apex TCB', 'iron', '4-PW, Project X 6.5', NULL),
    ('Callaway', 'Jaws Raw', 'wedge', '52° 10 bounce', NULL),
    ('Callaway', 'Jaws Raw', 'wedge', '56° 12 bounce', NULL),
    ('Callaway', 'Jaws Raw', 'wedge', '60° 10 bounce', NULL),
    ('Odyssey', 'White Hot OG', 'putter', 'Rossie style', NULL),
    ('Callaway', 'Chrome Soft X', 'ball', NULL, 'LS model'),
    ('Callaway', 'Tour Authentic', 'bag', NULL, NULL),
    ('Callaway', 'Tour Authentic', 'glove', NULL, NULL)
  ) AS e(brand, model, category, custom_specs, notes)
  WHERE b.user_id = v_user_id 
    AND b.name = 'Jon Rahm Masters'
    AND get_equipment_id_temp(e.brand, e.model, e.category) IS NOT NULL;

  -- Populate Viktor Hovland's bag
  INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
  SELECT 
    b.id,
    get_equipment_id_temp(e.brand, e.model, e.category),
    e.custom_specs,
    e.notes,
    1
  FROM user_bags b
  CROSS JOIN (VALUES
    ('Ping', 'G430 LST', 'driver', '9°, Ventus TR Blue', NULL),
    ('Ping', 'G430', 'fairway_wood', '15° LST model', NULL),
    ('Ping', 'G430', 'hybrid', '19°', NULL),
    ('Ping', 'i230', 'iron', '3-PW, KBS Tour 130X', 'Black dot'),
    ('Ping', 'Glide 4.0', 'wedge', '50° SS grind', NULL),
    ('Ping', 'Glide 4.0', 'wedge', '56° SS grind', NULL),
    ('Ping', 'Glide 4.0', 'wedge', '60° TS grind', NULL),
    ('Ping', 'PLD Anser', 'putter', '34 inches', 'Matte black'),
    ('Titleist', 'Pro V1', 'ball', NULL, NULL),
    ('Ping', 'Tour Staff Bag', 'bag', NULL, NULL),
    ('FootJoy', 'Pure Touch', 'glove', NULL, NULL)
  ) AS e(brand, model, category, custom_specs, notes)
  WHERE b.user_id = v_user_id 
    AND b.name = 'Viktor Hovland'
    AND get_equipment_id_temp(e.brand, e.model, e.category) IS NOT NULL;

  -- Populate remaining bags with a mix of equipment
  INSERT INTO user_bag_equipment (bag_id, equipment_id, quantity)
  SELECT DISTINCT ON (b.id, e.category)
    b.id as bag_id,
    e.id as equipment_id,
    1 as quantity
  FROM user_bags b
  CROSS JOIN equipment e
  WHERE b.user_id = v_user_id
    AND b.name IN ('Xander Schauffele', 'Collin Morikawa', 'Justin Thomas', 'Jordan Spieth', 'Patrick Cantlay', 'Dustin Johnson')
    AND e.category IN ('driver', 'fairway_wood', 'iron', 'wedge', 'putter', 'ball', 'bag', 'glove', 'tees')
    AND NOT EXISTS (
      SELECT 1 FROM user_bag_equipment be 
      WHERE be.bag_id = b.id AND be.equipment_id = e.id
    )
  ORDER BY b.id, e.category, e.brand, e.model;
  
  RAISE NOTICE 'Successfully created 10 pro golfer bags for user %', v_user_id;
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS get_equipment_id_temp(TEXT, TEXT, TEXT);

-- Verify the bags were created
SELECT 
  b.id,
  b.name,
  b.description,
  COUNT(be.id) as equipment_count
FROM user_bags b
LEFT JOIN user_bag_equipment be ON b.id = be.bag_id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
GROUP BY b.id, b.name, b.description
ORDER BY b.created_at DESC
LIMIT 10;

-- See equipment details for a specific bag
SELECT 
  e.brand,
  e.model,
  e.category,
  be.custom_specs,
  be.notes
FROM user_bags b
JOIN user_bag_equipment be ON b.id = be.bag_id
JOIN equipment e ON be.equipment_id = e.id
WHERE b.user_id = '68cf7bbe-e7d3-4255-a18c-f890766ff77b'
  AND b.name = 'Rory McIlroy 2024'
ORDER BY 
  CASE e.category
    WHEN 'driver' THEN 1
    WHEN 'fairway_wood' THEN 2
    WHEN 'hybrid' THEN 3
    WHEN 'iron' THEN 4
    WHEN 'wedge' THEN 5
    WHEN 'putter' THEN 6
    WHEN 'ball' THEN 7
    ELSE 8
  END;