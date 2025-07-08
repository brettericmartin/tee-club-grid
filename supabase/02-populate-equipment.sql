-- Populate Equipment Data
-- This creates a comprehensive equipment catalog

-- Drivers
INSERT INTO equipment (brand, model, category, msrp, image_url, description, release_date, popularity_score) VALUES
('TaylorMade', 'Qi10 Max', 'driver', 599.99, 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw4e9a3e3a/images/PDP/qi10-max-driver/qi10-max-driver-hero.jpg', 'Maximum forgiveness driver with 10K MOI', '2024-01-01', 95),
('TaylorMade', 'Qi10', 'driver', 599.99, 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw9c8e9f3a/images/PDP/qi10-driver/qi10-driver-hero.jpg', 'Tour-level driver with optimal launch and spin', '2024-01-01', 90),
('Titleist', 'TSR3', 'driver', 599.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f5f5f5f/TSR3_Driver.jpg', 'Speed-tuned performance driver', '2023-09-01', 92),
('Titleist', 'TSR2', 'driver', 599.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dw6g6g6g6g/TSR2_Driver.jpg', 'Maximum stability and speed', '2023-09-01', 88),
('Callaway', 'AI Smoke Max', 'driver', 599.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dw7h7h7h7h/ai-smoke-max-driver.jpg', 'AI-designed face for maximum forgiveness', '2024-01-15', 89),
('Ping', 'G430 Max', 'driver', 549.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dw8i8i8i8i/G430_Max_Driver.jpg', 'Longest, most forgiving driver', '2023-01-10', 87),
('Cobra', 'Darkspeed X', 'driver', 549.00, 'https://www.cobragolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-cobra-master/default/dw9j9j9j9j/darkspeed-x-driver.jpg', 'Maximum distance with forgiveness', '2024-01-01', 85),

-- Fairway Woods
('TaylorMade', 'Qi10 Fairway', 'fairway_wood', 349.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dwakakakak/qi10-fairway.jpg', 'Versatile fairway wood with exceptional launch', '2024-01-01', 88),
('Titleist', 'TSR3 Fairway', 'fairway_wood', 349.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwblblblbl/TSR3_Fairway.jpg', 'Tour-preferred fairway wood', '2023-09-01', 90),
('Callaway', 'AI Smoke Fairway', 'fairway_wood', 349.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dwcmcmcmcm/ai-smoke-fairway.jpg', 'AI-optimized for launch and spin', '2024-01-15', 86),
('Ping', 'G430 Fairway', 'fairway_wood', 299.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dwdndndndn/G430_Fairway.jpg', 'Easy-launching fairway wood', '2023-01-10', 85),

-- Hybrids
('TaylorMade', 'Qi10 Hybrid', 'hybrid', 279.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dweoeoeoe/qi10-hybrid.jpg', 'Ultimate versatility from any lie', '2024-01-01', 87),
('Titleist', 'TSR2 Hybrid', 'hybrid', 279.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwfpfpfpfp/TSR2_Hybrid.jpg', 'High launch, maximum forgiveness', '2023-09-01', 86),
('Callaway', 'Apex Hybrid', 'hybrid', 279.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dwgqgqgqgq/apex-hybrid.jpg', 'Players distance hybrid', '2023-06-01', 84),
('Ping', 'G430 Hybrid', 'hybrid', 249.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dwhrhrhrrh/G430_Hybrid.jpg', 'Easy-to-hit hybrid', '2023-01-10', 83),

-- Irons
('TaylorMade', 'P790', 'irons', 1399.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dwisisisisi/p790-irons.jpg', 'Forged hollow body players distance irons', '2023-08-01', 94),
('Titleist', 'T100', 'irons', 1399.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwjtjtjtjt/T100_Irons.jpg', 'Tour-proven performance and feel', '2023-08-15', 95),
('Titleist', 'T200', 'irons', 1399.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwkukukuku/T200_Irons.jpg', 'Players distance with tour looks', '2023-08-15', 91),
('Callaway', 'Apex Pro', 'irons', 1399.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dwlvlvlvlv/apex-pro-irons.jpg', 'Tour performance forged irons', '2023-02-01', 89),
('Ping', 'i230', 'irons', 1249.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dwmwmwmwmw/i230_Irons.jpg', 'Players irons with forgiveness', '2022-03-01', 88),
('Mizuno', 'JPX 923 Tour', 'irons', 1399.99, 'https://mizuno.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-mizuno-master/default/dwnxnxnxnx/jpx923tour.jpg', 'Grain flow forged tour irons', '2022-09-01', 92),

-- Wedges
('Titleist', 'Vokey SM10', 'wedges', 189.00, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwoyyoyoyo/Vokey_SM10.jpg', 'Most played wedges on tour', '2024-01-01', 98),
('TaylorMade', 'MG4', 'wedges', 179.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dwpzpzpzpz/mg4-wedge.jpg', 'Raw face technology for maximum spin', '2023-09-01', 90),
('Callaway', 'JAWS Raw', 'wedges', 169.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dwqaqaqaqa/jaws-raw-wedge.jpg', 'Most aggressive grooves in golf', '2023-03-01', 88),
('Cleveland', 'RTX 6 ZipCore', 'wedges', 169.99, 'https://www.clevelandgolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-cleveland-master/default/dwrbrbrbrb/rtx6-zipcore.jpg', 'Revolutionary core technology', '2023-01-15', 92),
('Ping', 'Glide 4.0', 'wedges', 169.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dwscscscsc/Glide_4_Wedge.jpg', 'Versatile wedge design', '2022-08-01', 85),

-- Putters
('Scotty Cameron', 'Phantom X 5', 'putter', 449.99, 'https://www.scottycameron.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-scotty-master/default/dwtdtdtdtd/phantom-x-5.jpg', 'Tour-proven mallet design', '2023-06-01', 94),
('Scotty Cameron', 'Special Select Newport 2', 'putter', 449.99, 'https://www.scottycameron.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-scotty-master/default/dwueueueue/newport-2.jpg', 'Classic blade putter', '2023-01-01', 96),
('Odyssey', 'White Hot OG', 'putter', 249.99, 'https://www.odysseygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-odyssey-master/default/dwvfvfvfvf/white-hot-og.jpg', 'Legendary White Hot insert', '2023-02-01', 89),
('TaylorMade', 'Spider Tour', 'putter', 349.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dwwgwgwgwg/spider-tour.jpg', 'True path alignment system', '2023-05-01', 87),
('Ping', 'PLD Anser', 'putter', 399.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dwxhxhxhxh/PLD_Anser.jpg', 'Precision milled putter', '2023-03-01', 88),

-- Golf Balls
('Titleist', 'Pro V1', 'golf_ball', 54.99, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwyiyiyiyi/ProV1_Ball.jpg', '#1 ball in golf', '2023-01-15', 98),
('Titleist', 'Pro V1x', 'golf_ball', 54.99, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dwzjzjzjzj/ProV1x_Ball.jpg', 'Higher flight, more spin', '2023-01-15', 96),
('TaylorMade', 'TP5', 'golf_ball', 49.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw0k0k0k0k/tp5-ball.jpg', '5-layer tour ball', '2023-02-01', 92),
('TaylorMade', 'TP5x', 'golf_ball', 49.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw1l1l1l1l/tp5x-ball.jpg', 'Fastest 5-layer tour ball', '2023-02-01', 90),
('Callaway', 'Chrome Soft', 'golf_ball', 49.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dw2m2m2m2m/chrome-soft.jpg', 'Exceptional feel and distance', '2023-01-20', 91),
('Bridgestone', 'Tour B X', 'golf_ball', 49.99, 'https://www.bridgestonegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-bridgestone-master/default/dw3n3n3n3n/tour-b-x.jpg', 'Distance and accuracy', '2023-02-15', 88),
('Srixon', 'Z-Star XV', 'golf_ball', 44.99, 'https://www.srixon.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-srixon-master/default/dw4o4o4o4o/z-star-xv.jpg', 'Tour performance, exceptional distance', '2023-01-01', 86),
('Wilson', 'Duo Soft', 'golf_ball', 24.99, 'https://www.wilson.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-wilson-master/default/dw5p5p5p5p/duo-soft.jpg', 'Softest golf ball', '2022-12-01', 82),

-- Accessories - Gloves
('FootJoy', 'StaSof', 'accessories', 29.99, 'https://www.footjoy.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-footjoy-master/default/dw6q6q6q6q/stasof-glove.jpg', 'Premium leather golf glove', '2023-01-01', 92),
('Titleist', 'Players', 'accessories', 24.99, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7r7r7r7r/players-glove.jpg', 'Tour players glove', '2023-01-01', 90),
('Callaway', 'Tour Authentic', 'accessories', 26.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dw8s8s8s8s/tour-authentic-glove.jpg', 'Premium cabretta leather', '2023-01-01', 88),
('TaylorMade', 'Tour Preferred', 'accessories', 24.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw9t9t9t9t/tour-preferred-glove.jpg', 'Tour-level performance', '2023-01-01', 87),

-- Accessories - Bags
('Titleist', 'Players 4', 'accessories', 239.99, 'https://www.titleist.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-titleist-master/default/dw0u0u0u0u/players-4-bag.jpg', 'Lightweight stand bag', '2023-03-01', 91),
('Ping', 'Hoofer 14', 'accessories', 259.99, 'https://ping.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-ping-master/default/dw1v1v1v1v/hoofer-14-bag.jpg', 'Most popular carry bag', '2023-02-01', 93),
('Callaway', 'Fairway 14', 'accessories', 279.99, 'https://www.callawaygolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-CG-Library/default/dw2w2w2w2w/fairway-14-bag.jpg', '14-way top stand bag', '2023-01-15', 89),
('TaylorMade', 'FlexTech Carry', 'accessories', 229.99, 'https://www.taylormadegolf.com/dw/image/v2/BFXF_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw3x3x3x3x/flextech-carry-bag.jpg', 'Lightweight and comfortable', '2023-02-01', 87),

-- Accessories - Tees & Other
('Pride', 'Professional Tee System', 'accessories', 9.99, 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=400&fit=crop', 'PGA Tour tee system', '2022-01-01', 85),
('Zero Friction', 'Tour 3-Prong', 'accessories', 12.99, 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop', 'Reduces friction and side spin', '2022-01-01', 82)
ON CONFLICT DO NOTHING;