-- Equipment data export from hardcoded database
-- Generated on 2025-07-06T23:44:27.791Z

-- This script will only insert equipment that does not already exist
-- based on brand and model combination

-- Insert equipment data

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Stealth 2',
  'driver',
  '/api/placeholder/400/400?text=TM+Stealth+2',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Stealth 2'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Stealth 2 Plus',
  'driver',
  '/api/placeholder/400/400?text=TM+Stealth+2+Plus',
  699,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Stealth 2 Plus'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Qi10',
  'driver',
  '/api/placeholder/400/400?text=TM+Qi10',
  599,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Qi10'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Qi10 LS',
  'driver',
  '/api/placeholder/400/400?text=TM+Qi10+LS',
  699,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Qi10 LS'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Paradym',
  'driver',
  '/api/placeholder/400/400?text=Callaway+Paradym',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Paradym'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Paradym Triple Diamond',
  'driver',
  '/api/placeholder/400/400?text=Callaway+Paradym+TD',
  699,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Paradym Triple Diamond'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'AI Smoke Max',
  'driver',
  '/api/placeholder/400/400?text=Callaway+AI+Smoke',
  599,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'AI Smoke Max'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'TSR2',
  'driver',
  '/api/placeholder/400/400?text=Titleist+TSR2',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'TSR2'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'TSR3',
  'driver',
  '/api/placeholder/400/400?text=Titleist+TSR3',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'TSR3'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'TSR4',
  'driver',
  '/api/placeholder/400/400?text=Titleist+TSR4',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'TSR4'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'G430 Max',
  'driver',
  '/api/placeholder/400/400?text=Ping+G430+Max',
  549,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'G430 Max'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'G430 LST',
  'driver',
  '/api/placeholder/400/400?text=Ping+G430+LST',
  549,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'G430 LST'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Cobra',
  'Aerojet',
  'driver',
  '/api/placeholder/400/400?text=Cobra+Aerojet',
  449,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Cobra' 
  AND model = 'Aerojet'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Cobra',
  'Darkspeed',
  'driver',
  '/api/placeholder/400/400?text=Cobra+Darkspeed',
  499,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Cobra' 
  AND model = 'Darkspeed'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'T100',
  'iron',
  '/api/placeholder/400/400?text=Titleist+T100',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'T100'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'T100S',
  'iron',
  '/api/placeholder/400/400?text=Titleist+T100S',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'T100S'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'T150',
  'iron',
  '/api/placeholder/400/400?text=Titleist+T150',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'T150'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'T200',
  'iron',
  '/api/placeholder/400/400?text=Titleist+T200',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'T200'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'P770',
  'iron',
  '/api/placeholder/400/400?text=TM+P770',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'P770'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'P790',
  'iron',
  '/api/placeholder/400/400?text=TM+P790',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'P790'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'P7MB',
  'iron',
  '/api/placeholder/400/400?text=TM+P7MB',
  1500,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'P7MB'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'P7MC',
  'iron',
  '/api/placeholder/400/400?text=TM+P7MC',
  1500,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'P7MC'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Apex Pro',
  'iron',
  '/api/placeholder/400/400?text=Callaway+Apex+Pro',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Apex Pro'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Apex CB',
  'iron',
  '/api/placeholder/400/400?text=Callaway+Apex+CB',
  1400,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Apex CB'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'i230',
  'iron',
  '/api/placeholder/400/400?text=Ping+i230',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'i230'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'i525',
  'iron',
  '/api/placeholder/400/400?text=Ping+i525',
  1400,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'i525'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Mizuno',
  'JPX 923 Tour',
  'iron',
  '/api/placeholder/400/400?text=Mizuno+JPX923+Tour',
  1400,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Mizuno' 
  AND model = 'JPX 923 Tour'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Mizuno',
  'Pro 221',
  'iron',
  '/api/placeholder/400/400?text=Mizuno+Pro+221',
  1500,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Mizuno' 
  AND model = 'Pro 221'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Mizuno',
  'Pro 223',
  'iron',
  '/api/placeholder/400/400?text=Mizuno+Pro+223',
  1500,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Mizuno' 
  AND model = 'Pro 223'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'Vokey SM9',
  'wedge',
  '/api/placeholder/400/400?text=Vokey+SM9',
  179,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'Vokey SM9'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'Vokey SM10',
  'wedge',
  '/api/placeholder/400/400?text=Vokey+SM10',
  189,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'Vokey SM10'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'MG3',
  'wedge',
  '/api/placeholder/400/400?text=TM+MG3',
  179,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'MG3'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'MG4',
  'wedge',
  '/api/placeholder/400/400?text=TM+MG4',
  189,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'MG4'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Jaws Raw',
  'wedge',
  '/api/placeholder/400/400?text=Callaway+Jaws+Raw',
  169,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Jaws Raw'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Cleveland',
  'RTX 6 ZipCore',
  'wedge',
  '/api/placeholder/400/400?text=Cleveland+RTX6',
  169,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Cleveland' 
  AND model = 'RTX 6 ZipCore'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'Glide 4.0',
  'wedge',
  '/api/placeholder/400/400?text=Ping+Glide+4',
  169,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'Glide 4.0'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Scotty Cameron',
  'Newport 2',
  'putter',
  '/api/placeholder/400/400?text=Scotty+Newport+2',
  599,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Scotty Cameron' 
  AND model = 'Newport 2'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Scotty Cameron',
  'Newport 2 Plus',
  'putter',
  '/api/placeholder/400/400?text=Scotty+Newport+2+Plus',
  629,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Scotty Cameron' 
  AND model = 'Newport 2 Plus'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Scotty Cameron',
  'Phantom X 5',
  'putter',
  '/api/placeholder/400/400?text=Scotty+Phantom+X5',
  599,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Scotty Cameron' 
  AND model = 'Phantom X 5'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Scotty Cameron',
  'Phantom 11',
  'putter',
  '/api/placeholder/400/400?text=Scotty+Phantom+11',
  629,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Scotty Cameron' 
  AND model = 'Phantom 11'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Odyssey',
  'White Hot OG',
  'putter',
  '/api/placeholder/400/400?text=Odyssey+White+Hot+OG',
  299,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Odyssey' 
  AND model = 'White Hot OG'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Odyssey',
  'Ai-ONE',
  'putter',
  '/api/placeholder/400/400?text=Odyssey+Ai+ONE',
  399,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Odyssey' 
  AND model = 'Ai-ONE'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Spider Tour',
  'putter',
  '/api/placeholder/400/400?text=TM+Spider+Tour',
  399,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Spider Tour'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'TP Hydro Blast',
  'putter',
  '/api/placeholder/400/400?text=TM+Hydro+Blast',
  299,
  2022,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'TP Hydro Blast'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'PLD Anser',
  'putter',
  '/api/placeholder/400/400?text=Ping+PLD+Anser',
  450,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'PLD Anser'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'DS72',
  'putter',
  '/api/placeholder/400/400?text=Ping+DS72',
  475,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'DS72'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'L.A.B. Golf',
  'DF3',
  'putter',
  '/api/placeholder/400/400?text=LAB+DF3',
  449,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'L.A.B. Golf' 
  AND model = 'DF3'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'L.A.B. Golf',
  'Link.1',
  'putter',
  '/api/placeholder/400/400?text=LAB+Link+1',
  399,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'L.A.B. Golf' 
  AND model = 'Link.1'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Bettinardi',
  'Queen B 6',
  'putter',
  '/api/placeholder/400/400?text=Bettinardi+QB6',
  600,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Bettinardi' 
  AND model = 'Queen B 6'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'Pro V1',
  'ball',
  '/api/placeholder/400/400?text=Titleist+Pro+V1',
  55,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'Pro V1'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'Pro V1x',
  'ball',
  '/api/placeholder/400/400?text=Titleist+Pro+V1x',
  55,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'Pro V1x'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'AVX',
  'ball',
  '/api/placeholder/400/400?text=Titleist+AVX',
  50,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'AVX'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'TP5',
  'ball',
  '/api/placeholder/400/400?text=TM+TP5',
  50,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'TP5'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'TP5x',
  'ball',
  '/api/placeholder/400/400?text=TM+TP5x',
  50,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'TP5x'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Callaway',
  'Chrome Soft',
  'ball',
  '/api/placeholder/400/400?text=Callaway+Chrome+Soft',
  50,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Callaway' 
  AND model = 'Chrome Soft'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Bridgestone',
  'Tour B X',
  'ball',
  '/api/placeholder/400/400?text=Bridgestone+Tour+BX',
  50,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Bridgestone' 
  AND model = 'Tour B X'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Srixon',
  'Z-Star',
  'ball',
  '/api/placeholder/400/400?text=Srixon+Z+Star',
  43,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Srixon' 
  AND model = 'Z-Star'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  'Players 4 Staff',
  'bag',
  '/api/placeholder/400/400?text=Titleist+Staff+Bag',
  650,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = 'Players 4 Staff'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'TaylorMade',
  'Tour Staff',
  'bag',
  '/api/placeholder/400/400?text=TM+Tour+Staff',
  600,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'TaylorMade' 
  AND model = 'Tour Staff'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Vessel',
  'Player IV Pro',
  'bag',
  '/api/placeholder/400/400?text=Vessel+Player+IV',
  395,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Vessel' 
  AND model = 'Player IV Pro'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'Hoofer 14',
  'bag',
  '/api/placeholder/400/400?text=Ping+Hoofer+14',
  260,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'Hoofer 14'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Sun Mountain',
  'C-130',
  'bag',
  '/api/placeholder/400/400?text=Sun+Mountain+C130',
  280,
  2024,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Sun Mountain' 
  AND model = 'C-130'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ogio',
  'Convoy SE',
  'bag',
  '/api/placeholder/400/400?text=Ogio+Convoy+SE',
  279,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ogio' 
  AND model = 'Convoy SE'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Ping',
  'Eye 2',
  'iron',
  '/api/placeholder/400/400?text=Ping+Eye+2+Vintage',
  NULL,
  1982,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Ping' 
  AND model = 'Eye 2'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Titleist',
  '681',
  'iron',
  '/api/placeholder/400/400?text=Titleist+681+Vintage',
  NULL,
  1990,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Titleist' 
  AND model = '681'
);

INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  'Bettinardi',
  'Custom DASS BB1',
  'putter',
  '/api/placeholder/400/400?text=Custom+Bettinardi+DASS',
  2500,
  2023,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = 'Bettinardi' 
  AND model = 'Custom DASS BB1'
);

-- Total equipment items: 66