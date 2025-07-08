-- Add non-club equipment and accessories to the equipment table
-- Run this first to ensure all equipment exists before creating bags

-- Golf Bags
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('TaylorMade', 'Tour Staff Bag', 'bag', 649.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Professional tour staff bag with premium materials and tour-inspired design', '{"weight": "10.5 lbs", "pockets": "10", "dividers": "6-way top", "material": "Synthetic leather"}'),
('Titleist', 'Players 4 Plus StaDry', 'bag', 329.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'Lightweight waterproof stand bag with 4-way top', '{"weight": "5.5 lbs", "pockets": "8", "dividers": "4-way top", "material": "Waterproof fabric"}'),
('Callaway', 'Tour Authentic Staff Bag', 'bag', 599.99, 2024, 'https://images.unsplash.com/photo-1592919505780-303950717480?w=400&h=400&fit=crop&q=80', 'Tour-grade staff bag used by Callaway professionals', '{"weight": "11 lbs", "pockets": "9", "dividers": "6-way top", "material": "Premium synthetic"}'),
('Ping', 'Tour Staff Bag', 'bag', 549.99, 2024, 'https://images.unsplash.com/photo-1606924842624-22b62ef09195?w=400&h=400&fit=crop&q=80', 'Tour staff bag with magnetic pockets and rain hood', '{"weight": "10 lbs", "pockets": "10", "dividers": "6-way top", "material": "Tour fabric"}');

-- Gloves
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('Titleist', 'Players Flex', 'glove', 24.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Premium cabretta leather glove with precision fit', '{"material": "Cabretta leather", "sizes": "S-XXL, Cadet sizes available", "hand": "Left and Right", "features": "Perforations for breathability"}'),
('FootJoy', 'Pure Touch Limited', 'glove', 34.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Tour-preferred premium leather glove', '{"material": "Premium cabretta leather", "sizes": "S-XXL, Cadet sizes", "hand": "Left and Right", "features": "3D fit, moisture control"}'),
('TaylorMade', 'Tour Preferred', 'glove', 27.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Tour-quality leather glove with superior grip', '{"material": "AAA cabretta leather", "sizes": "S-XXL", "hand": "Left and Right", "features": "Micro-perforations"}'),
('Callaway', 'Tour Authentic', 'glove', 26.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Premium performance glove with Optiflex material', '{"material": "Cabretta leather with Optiflex", "sizes": "S-XXL", "hand": "Left and Right", "features": "Perforated palm and fingers"}');

-- Tees
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('Pride', 'Professional Tees', 'tees', 9.99, 2024, 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=400&fit=crop&q=80', 'Tour-quality wooden tees in various lengths', '{"material": "Hardwood", "lengths": "2.75\", 3.25\", 4\"", "quantity": "50 pack", "color": "Natural, White, Black"}'),
('Zero Friction', '3-Prong Tour Tees', 'tees', 14.99, 2024, 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=400&fit=crop&q=80', 'Reduced friction design for longer drives', '{"material": "Bio-composite", "lengths": "2.75\", 3.25\"", "quantity": "40 pack", "features": "3-prong design"}'),
('4 Yards More', 'Golf Tees', 'tees', 19.99, 2024, 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=400&fit=crop&q=80', 'Proven to increase driving distance', '{"material": "Resin blend", "lengths": "3.25\", 4\"", "quantity": "4 pack", "features": "Flexible crown design"}');

-- Rangefinders
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('Bushnell', 'Pro X3', 'rangefinder', 599.99, 2024, 'https://images.unsplash.com/photo-1606924842624-8778c7b4c3aa?w=400&h=400&fit=crop&q=80', 'Tournament-legal laser rangefinder with slope', '{"range": "5-1300 yards", "accuracy": "+/- 1 yard", "magnification": "7x", "features": "Slope switch, BITE magnetic mount"}'),
('Bushnell', 'Tour V6 Shift', 'rangefinder', 399.99, 2024, 'https://images.unsplash.com/photo-1606924842624-8778c7b4c3aa?w=400&h=400&fit=crop&q=80', 'Slope-switch technology rangefinder', '{"range": "5-1000 yards", "accuracy": "+/- 1 yard", "magnification": "6x", "features": "Slope compensation, JOLT technology"}');

-- Speakers
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('Bushnell', 'Wingman Mini', 'speaker', 79.99, 2024, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&q=80', 'GPS golf speaker with audible distances', '{"battery": "10 hours", "features": "GPS distances, Bluetooth 5.0", "waterproof": "IPX6", "weight": "10 oz"}'),
('JBL', 'Clip 4', 'speaker', 79.95, 2024, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&q=80', 'Portable waterproof Bluetooth speaker', '{"battery": "10 hours", "features": "Bluetooth 5.1, Carabiner clip", "waterproof": "IP67", "weight": "8.5 oz"}');

-- Towels
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('Titleist', 'Players Towel', 'towel', 29.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Tour-quality microfiber golf towel', '{"material": "Microfiber", "size": "16\" x 24\"", "features": "Carabiner clip, scrub patch", "colors": "Black, White, Red, Navy"}'),
('Callaway', 'Tour Authentic Towel', 'towel', 24.99, 2024, 'https://images.unsplash.com/photo-1606924842584-c2f5163b0418?w=400&h=400&fit=crop&q=80', 'Premium tour towel with tri-fold design', '{"material": "100% Cotton", "size": "16\" x 32\"", "features": "Tri-fold design, carabiner", "colors": "White/Black, Black/White"}');

-- Add more club equipment for variety (fairway woods, hybrids)
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('TaylorMade', 'Qi10 Fairway', 'fairway_wood', 349.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'Qi10 fairway wood with carbonwood construction', '{"loft_options": "15°, 18°, 21°", "shaft": "Fujikura Ventus Blue", "adjustability": "Yes"}'),
('TaylorMade', 'Qi10 Hybrid', 'hybrid', 279.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Qi10 rescue hybrid', '{"loft_options": "19°, 22°, 25°", "shaft": "Fujikura Ventus Blue", "adjustability": "Yes"}'),
('Titleist', 'TSR3 Fairway', 'fairway_wood', 349.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'TSR3 fairway wood with SureFit adjustability', '{"loft_options": "15°, 16.5°, 18°", "shaft": "Fujikura Ventus Blue", "adjustability": "SureFit"}'),
('Titleist', 'TSR2 Hybrid', 'hybrid', 279.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'TSR2 hybrid with speed optimized design', '{"loft_options": "18°, 21°, 24°", "shaft": "Graphite Design Tour AD", "adjustability": "SureFit"}'),
('Callaway', 'Paradym Fairway', 'fairway_wood', 349.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'Paradym fairway with Jailbreak AI', '{"loft_options": "15°, 18°, 21°", "shaft": "Aldila Tour Green", "adjustability": "OptiFit"}'),
('Ping', 'G430 Fairway', 'fairway_wood', 349.99, 2024, 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop&q=80', 'G430 fairway wood with Facewrap technology', '{"loft_options": "15°, 17.5°, 20.5°", "shaft": "Ping Alta CB", "adjustability": "Yes"}'),
('Ping', 'G430 Hybrid', 'hybrid', 279.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'G430 hybrid with Carbonfly Wrap', '{"loft_options": "17°, 19°, 22°, 25°", "shaft": "Ping Alta CB", "adjustability": "Yes"}');

-- Add specific wedges
INSERT INTO equipment (brand, model, category, msrp, release_year, image_url, description, specs) VALUES
('TaylorMade', 'MG4 Chrome', 'wedge', 179.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Milled Grind 4 wedge with raw face technology', '{"loft_options": "46°-60°", "bounce_options": "8°-14°", "grind": "Standard, Low, High"}'),
('Titleist', 'Vokey SM10', 'wedge', 189.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Tour-proven wedge with TX9 grooves', '{"loft_options": "46°-62°", "bounce_options": "4°-14°", "grind": "F, S, M, K, L, D"}'),
('Cleveland', 'RTX 6 ZipCore', 'wedge', 169.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'RTX 6 with ZipCore technology', '{"loft_options": "46°-60°", "bounce_options": "6°-14°", "grind": "Low, Mid, Full"}'),
('Callaway', 'Jaws Raw', 'wedge', 179.99, 2024, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop&q=80', 'Raw face wedge for maximum spin', '{"loft_options": "48°-60°", "bounce_options": "8°-14°", "grind": "S, W, X"}');