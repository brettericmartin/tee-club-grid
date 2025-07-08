-- Add golf bags to equipment table

-- Check what bag equipment exists
SELECT * FROM equipment 
WHERE category IN ('bag', 'bags', 'golf_bag')
ORDER BY brand, model;

-- Insert sample golf bags
INSERT INTO equipment (brand, model, category, msrp, image_url, description)
VALUES 
  -- Stand Bags
  ('Titleist', 'Players 4 Plus Stand Bag', 'bags', 250, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw6b9d9b9a/TB22SX4K_01.png', 'Lightweight stand bag with 4-way top'),
  ('TaylorMade', 'FlexTech Carry Stand Bag', 'bags', 280, 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dwc8d8d3a3/zoom/TA875_1.jpg', 'Premium carry bag with 5-way top'),
  ('Callaway', 'Fairway C Stand Bag', 'bags', 220, 'https://www.callawaygolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7c7c8d3a/5122289_Fairway-C_001.jpg', 'Durable stand bag with double strap'),
  ('Ping', 'Hoofer 14 Stand Bag', 'bags', 260, 'https://pingmediastage.azureedge.net/mediastorage/mediastorage/ping-na/medialibrary/ecom/2023/bags/hoofer-14/hoofer-14-black-white.png', '14-way top stand bag'),
  
  -- Cart Bags
  ('Titleist', 'Cart 14 Bag', 'bags', 320, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw8b8d3a3a/TB22CT4K_01.png', 'Premium cart bag with 14-way top'),
  ('Sun Mountain', 'C-130 Cart Bag', 'bags', 280, 'https://shop.sunmountain.com/cdn/shop/products/C-130_Black_Gunmetal_Inferno_Front.jpg', 'Spacious cart bag with 14 pockets'),
  ('OGIO', 'Convoy SE Cart Bag', 'bags', 300, 'https://ogio.com/media/catalog/product/cache/1/image/1000x1000/9df78eab33525d08d6e5fb8d27136e95/1/2/124056_03_convoy_se_cart_bag.jpg', 'Modern cart bag with 14-way top'),
  
  -- Tour Bags
  ('Titleist', 'Tour Bag', 'bags', 550, 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7c7c8d3a/TB9TB6K_01.png', 'Professional tour bag'),
  ('TaylorMade', 'Tour Staff Bag', 'bags', 600, 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8b8d3a3a/zoom/TA934_1.jpg', 'Tour-quality staff bag'),
  ('Callaway', 'Tour Authentic Staff Bag', 'bags', 650, 'https://www.callawaygolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7c7c8d3a/5122345_Tour-Authentic_001.jpg', 'Premium tour staff bag'),
  
  -- Specialty Bags
  ('Jones', 'Carry Bag', 'bags', 240, 'https://www.jonessportsco.com/cdn/shop/products/jones-original-carry-black.jpg', 'Classic carry bag'),
  ('Vessel', 'Player IV Pro Stand Bag', 'bags', 450, 'https://vessel.com/cdn/shop/products/player-iv-pro-black.jpg', 'Premium leather stand bag'),
  ('Stitch', 'SL2 Stand Bag', 'bags', 350, 'https://www.stitchgolf.com/cdn/shop/products/sl2-black.jpg', 'Luxury stand bag')
ON CONFLICT DO NOTHING;

-- Update any existing 'bag' category to 'bags' for consistency
UPDATE equipment 
SET category = 'bags' 
WHERE category IN ('bag', 'golf_bag');