-- Create multiple professional golfer bags for a single user
-- Replace 'YOUR_USER_ID' with the actual user ID from your profiles table
-- This approach avoids RLS issues and is cleaner for demo purposes

-- First, let's create the bags
-- IMPORTANT: Replace 'YOUR_USER_ID' with an actual user ID from your profiles table
INSERT INTO user_bags (user_id, name, description, is_public) VALUES
('YOUR_USER_ID', 'Rory McIlroy 2024', 'Rory''s current TaylorMade tour setup with Qi10 driver and P760 irons', true),
('YOUR_USER_ID', 'Scottie Scheffler #1', 'World #1 mixed TaylorMade/Titleist setup', true),
('YOUR_USER_ID', 'Jon Rahm Masters', 'Rahm''s Callaway setup - Spanish Armada', true),
('YOUR_USER_ID', 'Viktor Hovland', 'Norwegian Thunder - Full PING setup', true),
('YOUR_USER_ID', 'Xander Schauffele', 'Olympic Gold winning Callaway clubs', true),
('YOUR_USER_ID', 'Collin Morikawa', 'Iron specialist''s TaylorMade precision setup', true),
('YOUR_USER_ID', 'Justin Thomas', 'JT''s Titleist major championship weapons', true),
('YOUR_USER_ID', 'Jordan Spieth', 'Texas Forever - Classic Titleist setup', true),
('YOUR_USER_ID', 'Patrick Cantlay', 'Calculated precision with Titleist', true),
('YOUR_USER_ID', 'Dustin Johnson', 'DJ''s TaylorMade bombing setup', true);

-- Helper function to get equipment ID with fallback
CREATE OR REPLACE FUNCTION get_equipment_id_safe(p_brand TEXT, p_model TEXT, p_category TEXT)
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

-- Populate Rory McIlroy's bag
WITH rory_bag AS (
  SELECT id FROM user_bags 
  WHERE user_id = 'YOUR_USER_ID' 
  AND name = 'Rory McIlroy 2024'
  LIMIT 1
)
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
SELECT 
  b.id,
  e.equipment_id,
  e.custom_specs,
  e.notes,
  1
FROM rory_bag b
CROSS JOIN (
  VALUES 
    (get_equipment_id_safe('TaylorMade', 'Qi10', 'driver'), 'Fujikura Ventus Black 6X, 9°', 'My gamer for 2024'),
    (get_equipment_id_safe('TaylorMade', 'Qi10', 'fairway_wood'), '15° 3-wood, Ventus Black 8X', NULL),
    (get_equipment_id_safe('TaylorMade', 'Qi10', 'fairway_wood'), '19° 5-wood, Ventus Black 9X', 'Go-to club'),
    (get_equipment_id_safe('TaylorMade', 'P760', 'iron'), '4-PW with Project X Rifle 7.0', 'Custom stamping'),
    (get_equipment_id_safe('TaylorMade', 'MG4', 'wedge'), '50° 9 bounce SB grind', NULL),
    (get_equipment_id_safe('TaylorMade', 'MG4', 'wedge'), '54° 11 bounce SB grind', NULL),
    (get_equipment_id_safe('TaylorMade', 'MG4', 'wedge'), '60° 8 bounce LB grind', 'Lob wedge'),
    (get_equipment_id_safe('TaylorMade', 'Spider Tour', 'putter'), '35", SuperStroke Traxion Tour', 'Red sightline'),
    (get_equipment_id_safe('TaylorMade', 'TP5x', 'ball'), NULL, '2024 model'),
    (get_equipment_id_safe('TaylorMade', 'Tour Staff Bag', 'bag'), NULL, 'Team TaylorMade'),
    (get_equipment_id_safe('TaylorMade', 'Tour Preferred', 'glove'), 'Size ML', NULL),
    (get_equipment_id_safe('Zero Friction', '3-Prong', 'tees'), '3.25" length', NULL),
    (get_equipment_id_safe('Bushnell', 'Pro X3', 'rangefinder'), NULL, 'Slope switch for practice')
) AS e(equipment_id, custom_specs, notes)
WHERE e.equipment_id IS NOT NULL;

-- Populate Scottie Scheffler's bag
WITH scottie_bag AS (
  SELECT id FROM user_bags 
  WHERE user_id = 'YOUR_USER_ID' 
  AND name = 'Scottie Scheffler #1'
  LIMIT 1
)
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
SELECT 
  b.id,
  e.equipment_id,
  e.custom_specs,
  e.notes,
  1
FROM scottie_bag b
CROSS JOIN (
  VALUES 
    (get_equipment_id_safe('TaylorMade', 'Qi10', 'driver'), 'Fujikura Ventus TR Black 6X, 8.5°', 'Low spin setup'),
    (get_equipment_id_safe('TaylorMade', 'Stealth 2', 'fairway_wood'), '16.5° with Ventus Black 8X', NULL),
    (get_equipment_id_safe('TaylorMade', 'Stealth 2', 'hybrid'), '21° with Graphite Design Tour AD IZ', NULL),
    (get_equipment_id_safe('TaylorMade', 'P7TW', 'iron'), '4-PW, Dynamic Gold Tour Issue X100', 'Tiger Woods design'),
    (get_equipment_id_safe('Titleist', 'Vokey SM9', 'wedge'), '50° 12F bounce', NULL),
    (get_equipment_id_safe('Titleist', 'Vokey SM9', 'wedge'), '56° 10S bounce', NULL),
    (get_equipment_id_safe('Titleist', 'Vokey SM9', 'wedge'), '60° 8M bounce', NULL),
    (get_equipment_id_safe('Scotty Cameron', 'Phantom X 5', 'putter'), '35 inches', 'Custom weights'),
    (get_equipment_id_safe('Titleist', 'Pro V1', 'ball'), NULL, 'Left dash'),
    (get_equipment_id_safe('Titleist', 'Players 4', 'bag'), NULL, 'StaDry'),
    (get_equipment_id_safe('Titleist', 'Players Flex', 'glove'), 'Size L', NULL),
    (get_equipment_id_safe('Pride', 'Professional', 'tees'), NULL, 'White 3.25"')
) AS e(equipment_id, custom_specs, notes)
WHERE e.equipment_id IS NOT NULL;

-- Populate Jon Rahm's bag
WITH rahm_bag AS (
  SELECT id FROM user_bags 
  WHERE user_id = 'YOUR_USER_ID' 
  AND name = 'Jon Rahm Masters'
  LIMIT 1
)
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
SELECT 
  b.id,
  e.equipment_id,
  e.custom_specs,
  e.notes,
  1
FROM rahm_bag b
CROSS JOIN (
  VALUES 
    (get_equipment_id_safe('Callaway', 'Paradym', 'driver'), 'Aldila Tour Green 75TX, 10.5°', 'Triple Diamond'),
    (get_equipment_id_safe('Callaway', 'Paradym', 'fairway_wood'), '15° 3W, Aldila Tour Green 85TX', NULL),
    (get_equipment_id_safe('Callaway', 'Paradym', 'fairway_wood'), '18° 5W, Aldila Tour Green 85TX', NULL),
    (get_equipment_id_safe('Callaway', 'Apex TCB', 'iron'), '4-PW with Project X Rifle 6.5', NULL),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '52° 10 bounce', 'Raw face'),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '56° 12 bounce', 'Raw face'),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '60° 10 bounce', 'Raw face'),
    (get_equipment_id_safe('Odyssey', 'White Hot OG', 'putter'), '35", Rossie style', NULL),
    (get_equipment_id_safe('Callaway', 'Chrome Soft X', 'ball'), NULL, 'LS model'),
    (get_equipment_id_safe('Callaway', 'Tour Authentic', 'bag'), NULL, 'Staff bag'),
    (get_equipment_id_safe('Callaway', 'Tour Authentic', 'glove'), 'Size ML', NULL),
    (get_equipment_id_safe('4 Yards More', 'Golf Tees', 'tees'), NULL, 'Orange')
) AS e(equipment_id, custom_specs, notes)
WHERE e.equipment_id IS NOT NULL;

-- Populate Viktor Hovland's bag
WITH viktor_bag AS (
  SELECT id FROM user_bags 
  WHERE user_id = 'YOUR_USER_ID' 
  AND name = 'Viktor Hovland'
  LIMIT 1
)
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
SELECT 
  b.id,
  e.equipment_id,
  e.custom_specs,
  e.notes,
  1
FROM viktor_bag b
CROSS JOIN (
  VALUES 
    (get_equipment_id_safe('Ping', 'G430 LST', 'driver'), 'Fujikura Ventus TR Blue 6X, 9°', NULL),
    (get_equipment_id_safe('Ping', 'G430', 'fairway_wood'), '15° LST, Ventus Blue 7X', NULL),
    (get_equipment_id_safe('Ping', 'G430', 'hybrid'), '19° with Ventus Blue 8X', NULL),
    (get_equipment_id_safe('Ping', 'i230', 'iron'), '3-PW with KBS Tour 130 X', 'Black dot'),
    (get_equipment_id_safe('Ping', 'Glide 4.0', 'wedge'), '50° 10 bounce SS', NULL),
    (get_equipment_id_safe('Ping', 'Glide 4.0', 'wedge'), '56° 12 bounce SS', NULL),
    (get_equipment_id_safe('Ping', 'Glide 4.0', 'wedge'), '60° 10 bounce TS', NULL),
    (get_equipment_id_safe('Ping', 'PLD Anser', 'putter'), '34", matte black', NULL),
    (get_equipment_id_safe('Titleist', 'Pro V1', 'ball'), NULL, NULL),
    (get_equipment_id_safe('Ping', 'Tour Staff Bag', 'bag'), NULL, NULL),
    (get_equipment_id_safe('FootJoy', 'Pure Touch', 'glove'), 'Size ML', NULL),
    (get_equipment_id_safe('Bushnell', 'Wingman Mini', 'speaker'), NULL, 'Course tunes')
) AS e(equipment_id, custom_specs, notes)
WHERE e.equipment_id IS NOT NULL;

-- Continue pattern for remaining bags...
-- Xander Schauffele
WITH xander_bag AS (
  SELECT id FROM user_bags 
  WHERE user_id = 'YOUR_USER_ID' 
  AND name = 'Xander Schauffele'
  LIMIT 1
)
INSERT INTO user_bag_equipment (bag_id, equipment_id, custom_specs, notes, quantity)
SELECT 
  b.id,
  e.equipment_id,
  e.custom_specs,
  e.notes,
  1
FROM xander_bag b
CROSS JOIN (
  VALUES 
    (get_equipment_id_safe('Callaway', 'Paradym', 'driver'), 'Fujikura Ventus Blue 6X, 10.5°', 'Triple Diamond'),
    (get_equipment_id_safe('Callaway', 'Paradym', 'fairway_wood'), '15°, Mitsubishi Tensei White 80TX', NULL),
    (get_equipment_id_safe('Callaway', 'Apex UW', 'hybrid'), '20° utility wood', NULL),
    (get_equipment_id_safe('Callaway', 'X Forged UT', 'iron'), '18° driving iron', NULL),
    (get_equipment_id_safe('Callaway', 'Apex Pro', 'iron'), '5-PW, Dynamic Gold X100', NULL),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '50° 10 bounce', NULL),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '56° 12 bounce', NULL),
    (get_equipment_id_safe('Callaway', 'Jaws Raw', 'wedge'), '60° 10 bounce', NULL),
    (get_equipment_id_safe('Odyssey', 'Toulon Design', 'putter'), 'San Diego model', NULL),
    (get_equipment_id_safe('Callaway', 'Chrome Soft X', 'ball'), NULL, NULL),
    (get_equipment_id_safe('Callaway', 'Tour Authentic', 'bag'), NULL, NULL)
) AS e(equipment_id, custom_specs, notes)
WHERE e.equipment_id IS NOT NULL;

-- Clean up
DROP FUNCTION IF EXISTS get_equipment_id_safe(TEXT, TEXT, TEXT);

-- IMPORTANT: After running this script, update 'YOUR_USER_ID' with an actual user ID
-- You can find a user ID by running: SELECT id, username FROM profiles LIMIT 1;