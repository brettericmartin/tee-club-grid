-- Create bags for professional golfers
-- Run this after creating profiles and ensuring equipment exists

-- Create bags for each pro
INSERT INTO user_bags (user_id, name, description, is_public) VALUES
('11111111-1111-1111-1111-111111111111', 'Rory''s 2024 Setup', 'My current tour setup with Qi10 driver and P760 irons', true),
('22222222-2222-2222-2222-222222222222', 'World #1 Setup', 'The equipment that took me to the top of the world rankings', true),
('33333333-3333-3333-3333-333333333333', 'Spanish Armada', 'My Callaway setup for conquering courses worldwide', true),
('44444444-4444-4444-4444-444444444444', 'Norwegian Thunder', 'PING precision for consistent performance', true),
('55555555-5555-5555-5555-555555555555', 'Olympic Gold Setup', 'The clubs that won me Olympic gold', true),
('66666666-6666-6666-6666-666666666666', 'Iron Master', 'Precision irons for surgical approach shots', true),
('77777777-7777-7777-7777-777777777777', 'JT''s Weapons', 'Titleist tour setup for major championships', true),
('88888888-8888-8888-8888-888888888888', 'Texas Forever', 'My trusted Titleist setup', true),
('99999999-9999-9999-9999-999999999999', 'Calculated Precision', 'Equipment for strategic play', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DJ''s Bombers', 'Long drive setup with TaylorMade', true);

-- Now we need to populate these bags with equipment
-- First, let's create a temporary table to help us map equipment
CREATE TEMP TABLE IF NOT EXISTS equipment_mapping AS
SELECT 
  id,
  brand,
  model,
  category,
  ROW_NUMBER() OVER (PARTITION BY brand, category ORDER BY model) as rn
FROM equipment;

-- Helper function to get equipment ID by brand, model, and category
CREATE OR REPLACE FUNCTION get_equipment_id(p_brand TEXT, p_model TEXT, p_category TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM equipment
  WHERE brand = p_brand 
    AND model = p_model 
    AND category = p_category
  LIMIT 1;
  
  -- If exact match not found, try partial match
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM equipment
    WHERE brand = p_brand 
      AND category = p_category
    LIMIT 1;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Populate Rory McIlroy's bag
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
SELECT 
  b.id as bag_id,
  e.equipment_id,
  e.custom_specs,
  e.notes
FROM user_bags b
CROSS JOIN (
  VALUES 
    (get_equipment_id('TaylorMade', 'Qi10', 'driver'), 'Fujikura Ventus Black 6X, 9°', 'My gamer for 2024'),
    (get_equipment_id('TaylorMade', 'Qi10 Fairway', 'fairway_wood'), '15° with Fujikura Ventus Black 8X', NULL),
    (get_equipment_id('TaylorMade', 'Qi10 Fairway', 'fairway_wood'), '19° with Fujikura Ventus Black 9X', NULL),
    (get_equipment_id('TaylorMade', 'P760', 'iron'), '4-PW with Project X Rifle 7.0', 'Custom stamping'),
    (get_equipment_id('TaylorMade', 'MG4 Chrome', 'wedge'), '50° 9 bounce', NULL),
    (get_equipment_id('TaylorMade', 'MG4 Chrome', 'wedge'), '54° 11 bounce', NULL),
    (get_equipment_id('TaylorMade', 'MG4 Chrome', 'wedge'), '60° 8 bounce', NULL),
    (get_equipment_id('TaylorMade', 'Spider Tour X', 'putter'), '35 inches, SuperStroke grip', 'Red alignment'),
    (get_equipment_id('TaylorMade', 'TP5x', 'ball'), NULL, '2024 model'),
    (get_equipment_id('TaylorMade', 'Tour Staff Bag', 'bag'), NULL, 'Team TaylorMade'),
    (get_equipment_id('TaylorMade', 'Tour Preferred', 'glove'), 'Size ML', NULL),
    (get_equipment_id('Zero Friction', '3-Prong Tour Tees', 'tees'), NULL, NULL),
    (get_equipment_id('Bushnell', 'Pro X3', 'rangefinder'), NULL, 'Tournament mode')
) AS e(equipment_id, custom_specs, notes)
WHERE b.user_id = '11111111-1111-1111-1111-111111111111'
AND e.equipment_id IS NOT NULL;

-- Populate Scottie Scheffler's bag
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
SELECT 
  b.id as bag_id,
  e.equipment_id,
  e.custom_specs,
  e.notes
FROM user_bags b
CROSS JOIN (
  VALUES 
    (get_equipment_id('TaylorMade', 'Qi10', 'driver'), 'Fujikura Ventus TR Black 6X, 8.5°', 'Low spin setup'),
    (get_equipment_id('TaylorMade', 'Stealth 2', 'fairway_wood'), '16.5° with Fujikura Ventus Black 8X', NULL),
    (get_equipment_id('TaylorMade', 'Stealth 2', 'hybrid'), '21° with Graphite Design Tour AD IZ 95X', NULL),
    (get_equipment_id('TaylorMade', 'P7TW', 'iron'), '4-PW with True Temper Dynamic Gold Tour Issue X100', 'Tiger Woods design'),
    (get_equipment_id('Titleist', 'Vokey SM9', 'wedge'), '50° 12F bounce', NULL),
    (get_equipment_id('Titleist', 'Vokey SM9', 'wedge'), '56° 10S bounce', NULL),
    (get_equipment_id('Titleist', 'Vokey SM9', 'wedge'), '60° 8M bounce', NULL),
    (get_equipment_id('Scotty Cameron', 'Phantom X 5', 'putter'), '35 inches', 'Custom weights'),
    (get_equipment_id('Titleist', 'Pro V1', 'ball'), NULL, 'Left dash'),
    (get_equipment_id('Titleist', 'Players 4 Plus StaDry', 'bag'), NULL, NULL),
    (get_equipment_id('Titleist', 'Players Flex', 'glove'), 'Size L', NULL),
    (get_equipment_id('Pride', 'Professional Tees', 'tees'), NULL, NULL),
    (get_equipment_id('Bushnell', 'Tour V6 Shift', 'rangefinder'), NULL, NULL)
) AS e(equipment_id, custom_specs, notes)
WHERE b.user_id = '22222222-2222-2222-2222-222222222222'
AND e.equipment_id IS NOT NULL;

-- Populate Jon Rahm's bag
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
SELECT 
  b.id as bag_id,
  e.equipment_id,
  e.custom_specs,
  e.notes
FROM user_bags b
CROSS JOIN (
  VALUES 
    (get_equipment_id('Callaway', 'Paradym', 'driver'), 'Aldila Tour Green 75TX, 10.5°', 'Triple Diamond'),
    (get_equipment_id('Callaway', 'Paradym Fairway', 'fairway_wood'), '15° with Aldila Tour Green 85TX', NULL),
    (get_equipment_id('Callaway', 'Paradym Fairway', 'fairway_wood'), '18° with Aldila Tour Green 85TX', NULL),
    (get_equipment_id('Callaway', 'Apex TCB', 'iron'), '4-PW with Project X Rifle 6.5', 'Tour Cavity Back'),
    (get_equipment_id('Callaway', 'Jaws Raw', 'wedge'), '52° 10 bounce', 'Raw face'),
    (get_equipment_id('Callaway', 'Jaws Raw', 'wedge'), '56° 12 bounce', 'Raw face'),
    (get_equipment_id('Callaway', 'Jaws Raw', 'wedge'), '60° 10 bounce', 'Raw face'),
    (get_equipment_id('Odyssey', 'White Hot OG Rossie', 'putter'), '35 inches', 'Center shaft'),
    (get_equipment_id('Callaway', 'Chrome Soft X', 'ball'), NULL, 'LS model'),
    (get_equipment_id('Callaway', 'Tour Authentic Staff Bag', 'bag'), NULL, NULL),
    (get_equipment_id('Callaway', 'Tour Authentic', 'glove'), 'Size ML', NULL),
    (get_equipment_id('4 Yards More', 'Golf Tees', 'tees'), NULL, NULL),
    (get_equipment_id('Bushnell', 'Pro X3', 'rangefinder'), NULL, NULL)
) AS e(equipment_id, custom_specs, notes)
WHERE b.user_id = '33333333-3333-3333-3333-333333333333'
AND e.equipment_id IS NOT NULL;

-- Populate Viktor Hovland's bag
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes)
SELECT 
  b.id as bag_id,
  e.equipment_id,
  e.custom_specs,
  e.notes
FROM user_bags b
CROSS JOIN (
  VALUES 
    (get_equipment_id('Ping', 'G430 LST', 'driver'), 'Fujikura Ventus TR Blue 6X, 9°', 'Low spin technology'),
    (get_equipment_id('Ping', 'G430 Fairway', 'fairway_wood'), '15° with Fujikura Ventus Blue 7X', 'LST model'),
    (get_equipment_id('Ping', 'G430 Hybrid', 'hybrid'), '19° with Fujikura Ventus Blue 8X', NULL),
    (get_equipment_id('Ping', 'i230', 'iron'), '3-PW with KBS Tour 130 X', 'Black dot'),
    (get_equipment_id('Ping', 'Glide 4.0', 'wedge'), '50° 10 bounce', 'SS grind'),
    (get_equipment_id('Ping', 'Glide 4.0', 'wedge'), '56° 12 bounce', 'SS grind'),
    (get_equipment_id('Ping', 'Glide 4.0', 'wedge'), '60° 10 bounce', 'TS grind'),
    (get_equipment_id('Ping', 'PLD Anser 2', 'putter'), '34 inches', 'Matte black'),
    (get_equipment_id('Titleist', 'Pro V1', 'ball'), NULL, NULL),
    (get_equipment_id('Ping', 'Tour Staff Bag', 'bag'), NULL, NULL),
    (get_equipment_id('FootJoy', 'Pure Touch Limited', 'glove'), 'Size ML', NULL),
    (get_equipment_id('Pride', 'Professional Tees', 'tees'), NULL, NULL),
    (get_equipment_id('Bushnell', 'Wingman Mini', 'speaker'), NULL, 'Course tunes')
) AS e(equipment_id, custom_specs, notes)
WHERE b.user_id = '44444444-4444-4444-4444-444444444444'
AND e.equipment_id IS NOT NULL;

-- Continue with remaining golfers...
-- You can add the rest following the same pattern

-- Clean up temp function
DROP FUNCTION IF EXISTS get_equipment_id(TEXT, TEXT, TEXT);