-- Add more accessory categories to equipment

-- First, let's check what categories exist
SELECT DISTINCT category FROM equipment ORDER BY category;

-- Insert sample accessories if they don't exist
INSERT INTO equipment (brand, model, category, msrp, image_url)
VALUES 
  -- Gloves
  ('Titleist', 'Players Glove', 'gloves', 25, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7c7c8d3a/TG-PG-2135_01.png'),
  ('FootJoy', 'Pure Touch', 'gloves', 30, 'https://www.footjoy.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-footjoy-master/default/dw8b8d3a3a/66101_01.jpg'),
  ('TaylorMade', 'Tour Preferred', 'gloves', 20, 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw7c7c8d3a/zoom/B1589401_1.jpg'),
  
  -- Speakers
  ('Bushnell', 'Wingman GPS Speaker', 'speakers', 150, 'https://www.bushnellgolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-bushnell-master/default/dw7c7c8d3a/361910_01.jpg'),
  ('Blue Tees', 'Player+ Speaker', 'speakers', 120, 'https://blueteesgolf.com/cdn/shop/products/player-plus-speaker.jpg'),
  
  -- Tees
  ('Pride', 'Professional Tee System', 'tees', 10, 'https://www.pridegolf.com/wp-content/uploads/2019/05/PTS-Natural-1.jpg'),
  ('Zero Friction', 'Tour 3-Prong', 'tees', 15, 'https://www.zerofriction.com/wp-content/uploads/2021/01/tour-3-prong-tees.jpg'),
  
  -- Towels
  ('Titleist', 'Players Towel', 'towels', 25, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7c7c8d3a/TA9PLTWL-00_01.png'),
  ('TaylorMade', 'Microfiber Cart Towel', 'towels', 20, 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw7c7c8d3a/zoom/CCN56_1.jpg'),
  
  -- Ball Markers
  ('Scotty Cameron', 'Circle T Ball Marker', 'ball_marker', 35, 'https://www.scottycameron.com/media/catalog/product/cache/1/image/1000x1000/9df78eab33525d08d6e5fb8d27136e95/2/0/2022_circle_t_ball_marker.jpg'),
  ('Titleist', 'BallMark Hat Clip', 'ball_marker', 15, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7c7c8d3a/TA7ACBMHC-00_01.png')
ON CONFLICT DO NOTHING;

-- Update any existing 'accessories' category to be more specific if needed
UPDATE equipment 
SET category = CASE
  WHEN model ILIKE '%glove%' THEN 'gloves'
  WHEN model ILIKE '%speaker%' THEN 'speakers'
  WHEN model ILIKE '%tee%' THEN 'tees'
  WHEN model ILIKE '%towel%' THEN 'towels'
  WHEN model ILIKE '%marker%' THEN 'ball_marker'
  ELSE category
END
WHERE category = 'accessories';