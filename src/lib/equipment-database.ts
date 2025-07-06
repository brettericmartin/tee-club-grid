import { Equipment } from './equipment-types';

// DRIVERS (2022-2024)
export const drivers: Equipment[] = [
  // TaylorMade
  {
    id: 'tm-stealth2-2023',
    brand: 'TaylorMade',
    model: 'Stealth 2',
    category: 'driver',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=TM+Stealth+2',
    description: '60X Carbon Twist Face with advanced ICT',
    specs: {
      lofts: ['8°', '9°', '10.5°', '12°'],
      stock_shaft: 'Fujikura Ventus Red TR',
      head_size: '460cc'
    },
    isVerified: true
  },
  {
    id: 'tm-stealth2-plus-2023',
    brand: 'TaylorMade',
    model: 'Stealth 2 Plus',
    category: 'driver',
    year: 2023,
    msrp: 699,
    image: '/api/placeholder/400/400?text=TM+Stealth+2+Plus',
    description: 'Tour-inspired with sliding weight track',
    specs: {
      lofts: ['8°', '9°', '10.5°'],
      stock_shaft: 'Fujikura Ventus Black TR',
      head_size: '460cc'
    },
    isVerified: true
  },
  {
    id: 'tm-qi10-2024',
    brand: 'TaylorMade',
    model: 'Qi10',
    category: 'driver',
    year: 2024,
    msrp: 599,
    image: '/api/placeholder/400/400?text=TM+Qi10',
    description: 'New 10K MOI design for ultimate forgiveness',
    isVerified: true
  },
  {
    id: 'tm-qi10-ls-2024',
    brand: 'TaylorMade',
    model: 'Qi10 LS',
    category: 'driver',
    year: 2024,
    msrp: 699,
    image: '/api/placeholder/400/400?text=TM+Qi10+LS',
    description: 'Low spin tour model',
    isVerified: true
  },

  // Callaway
  {
    id: 'callaway-paradym-2023',
    brand: 'Callaway',
    model: 'Paradym',
    category: 'driver',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Callaway+Paradym',
    description: '360° Carbon Chassis with Jailbreak AI',
    specs: {
      lofts: ['9°', '10.5°', '12°'],
      stock_shaft: 'Project X HZRDUS Silver',
      head_size: '460cc'
    },
    isVerified: true
  },
  {
    id: 'callaway-paradym-triple-diamond-2023',
    brand: 'Callaway',
    model: 'Paradym Triple Diamond',
    category: 'driver',
    year: 2023,
    msrp: 699,
    image: '/api/placeholder/400/400?text=Callaway+Paradym+TD',
    description: 'Tour-level low spin',
    isVerified: true
  },
  {
    id: 'callaway-ai-smoke-2024',
    brand: 'Callaway',
    model: 'AI Smoke Max',
    category: 'driver',
    year: 2024,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Callaway+AI+Smoke',
    description: 'AI Smart Face technology',
    isVerified: true
  },

  // Titleist
  {
    id: 'titleist-tsr2-2023',
    brand: 'Titleist',
    model: 'TSR2',
    category: 'driver',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Titleist+TSR2',
    description: 'Multi-plateau VFT face design',
    specs: {
      lofts: ['8°', '9°', '10°', '11°'],
      stock_shaft: 'HZRDUS Red CB',
      head_size: '460cc'
    },
    isVerified: true
  },
  {
    id: 'titleist-tsr3-2023',
    brand: 'Titleist',
    model: 'TSR3',
    category: 'driver',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Titleist+TSR3',
    description: 'SureFit adjustable CG track',
    isVerified: true
  },
  {
    id: 'titleist-tsr4-2023',
    brand: 'Titleist',
    model: 'TSR4',
    category: 'driver',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Titleist+TSR4',
    description: 'Ultra low spin 430cc head',
    isVerified: true
  },

  // Ping
  {
    id: 'ping-g430-max-2023',
    brand: 'Ping',
    model: 'G430 Max',
    category: 'driver',
    year: 2023,
    msrp: 549,
    image: '/api/placeholder/400/400?text=Ping+G430+Max',
    description: 'Highest MOI in PING history',
    specs: {
      lofts: ['9°', '10.5°', '12°'],
      stock_shaft: 'PING Alta CB',
      head_size: '460cc'
    },
    isVerified: true
  },
  {
    id: 'ping-g430-lst-2023',
    brand: 'Ping',
    model: 'G430 LST',
    category: 'driver',
    year: 2023,
    msrp: 549,
    image: '/api/placeholder/400/400?text=Ping+G430+LST',
    description: 'Low spin tour option',
    isVerified: true
  },

  // Cobra
  {
    id: 'cobra-aerojet-2023',
    brand: 'Cobra',
    model: 'Aerojet',
    category: 'driver',
    year: 2023,
    msrp: 449,
    image: '/api/placeholder/400/400?text=Cobra+Aerojet',
    description: 'Aerodynamic shaping with PWR-BRIDGE',
    isVerified: true
  },
  {
    id: 'cobra-darkspeed-2024',
    brand: 'Cobra',
    model: 'Darkspeed',
    category: 'driver',
    year: 2024,
    msrp: 499,
    image: '/api/placeholder/400/400?text=Cobra+Darkspeed',
    description: 'Aerospace grade aluminum and carbon',
    isVerified: true
  }
];

// IRONS (2022-2024)
export const irons: Equipment[] = [
  // Titleist
  {
    id: 'titleist-t100-2023',
    brand: 'Titleist',
    model: 'T100',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Titleist+T100',
    description: 'Tour-proven performance with refined feel',
    specs: {
      available_irons: '4-PW',
      stock_shaft: 'True Temper AMT Tour White',
      handicap_range: '0-10'
    },
    isVerified: true
  },
  {
    id: 'titleist-t100s-2023',
    brand: 'Titleist',
    model: 'T100S',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Titleist+T100S',
    description: '2° stronger lofts for more distance',
    isVerified: true
  },
  {
    id: 'titleist-t150-2023',
    brand: 'Titleist',
    model: 'T150',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Titleist+T150',
    description: 'Players distance with speed and stability',
    isVerified: true
  },
  {
    id: 'titleist-t200-2023',
    brand: 'Titleist',
    model: 'T200',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Titleist+T200',
    description: 'Maximum speed in a players shape',
    isVerified: true
  },

  // TaylorMade
  {
    id: 'taylormade-p770-2023',
    brand: 'TaylorMade',
    model: 'P770',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=TM+P770',
    description: 'Forged hollow body construction',
    specs: {
      available_irons: '4-PW',
      stock_shaft: 'KBS Tour',
      handicap_range: '5-15'
    },
    isVerified: true
  },
  {
    id: 'taylormade-p790-2023',
    brand: 'TaylorMade',
    model: 'P790',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=TM+P790',
    description: 'SpeedFoam Air for enhanced feel',
    isVerified: true
  },
  {
    id: 'taylormade-p7mb-2023',
    brand: 'TaylorMade',
    model: 'P7MB',
    category: 'iron',
    year: 2023,
    msrp: 1500,
    image: '/api/placeholder/400/400?text=TM+P7MB',
    description: 'Tour-inspired muscle back',
    isVerified: true
  },
  {
    id: 'taylormade-p7mc-2023',
    brand: 'TaylorMade',
    model: 'P7MC',
    category: 'iron',
    year: 2023,
    msrp: 1500,
    image: '/api/placeholder/400/400?text=TM+P7MC',
    description: 'Compact cavity back for tour players',
    isVerified: true
  },

  // Callaway
  {
    id: 'callaway-apex-pro-2023',
    brand: 'Callaway',
    model: 'Apex Pro',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Callaway+Apex+Pro',
    description: 'True players performance',
    isVerified: true
  },
  {
    id: 'callaway-apex-cb-2024',
    brand: 'Callaway',
    model: 'Apex CB',
    category: 'iron',
    year: 2024,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Callaway+Apex+CB',
    description: 'Tour cavity back design',
    isVerified: true
  },

  // Ping
  {
    id: 'ping-i230-2023',
    brand: 'Ping',
    model: 'i230',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Ping+i230',
    description: 'Activated elastomer for pure feel',
    isVerified: true
  },
  {
    id: 'ping-i525-2022',
    brand: 'Ping',
    model: 'i525',
    category: 'iron',
    year: 2022,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Ping+i525',
    description: 'Forged face with hollow body',
    isVerified: true
  },

  // Mizuno
  {
    id: 'mizuno-jpx923-tour-2023',
    brand: 'Mizuno',
    model: 'JPX 923 Tour',
    category: 'iron',
    year: 2023,
    msrp: 1400,
    image: '/api/placeholder/400/400?text=Mizuno+JPX923+Tour',
    description: 'Grain flow forged HD',
    isVerified: true
  },
  {
    id: 'mizuno-pro-221-2022',
    brand: 'Mizuno',
    model: 'Pro 221',
    category: 'iron',
    year: 2022,
    msrp: 1500,
    image: '/api/placeholder/400/400?text=Mizuno+Pro+221',
    description: 'Ultimate blade for purists',
    isVerified: true
  },
  {
    id: 'mizuno-pro-223-2022',
    brand: 'Mizuno',
    model: 'Pro 223',
    category: 'iron',
    year: 2022,
    msrp: 1500,
    image: '/api/placeholder/400/400?text=Mizuno+Pro+223',
    description: 'Players cavity with micro slot',
    isVerified: true
  }
];

// WEDGES (2022-2024)
export const wedges: Equipment[] = [
  // Titleist Vokey
  {
    id: 'vokey-sm9-2022',
    brand: 'Titleist',
    model: 'Vokey SM9',
    category: 'wedge',
    year: 2022,
    msrp: 179,
    image: '/api/placeholder/400/400?text=Vokey+SM9',
    description: 'Ultimate shot versatility',
    specs: {
      lofts: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°'],
      grinds: ['F', 'S', 'M', 'L', 'D', 'K'],
      finishes: ['Tour Chrome', 'Brushed Steel', 'Jet Black']
    },
    isVerified: true
  },
  {
    id: 'vokey-sm10-2024',
    brand: 'Titleist',
    model: 'Vokey SM10',
    category: 'wedge',
    year: 2024,
    msrp: 189,
    image: '/api/placeholder/400/400?text=Vokey+SM10',
    description: 'New grooves and enhanced feel',
    isVerified: true
  },

  // TaylorMade
  {
    id: 'taylormade-mg3-2022',
    brand: 'TaylorMade',
    model: 'MG3',
    category: 'wedge',
    year: 2022,
    msrp: 179,
    image: '/api/placeholder/400/400?text=TM+MG3',
    description: 'Raised micro ribs for raw face',
    specs: {
      lofts: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°'],
      grinds: ['SB', 'LB', 'HB']
    },
    isVerified: true
  },
  {
    id: 'taylormade-mg4-2024',
    brand: 'TaylorMade',
    model: 'MG4',
    category: 'wedge',
    year: 2024,
    msrp: 189,
    image: '/api/placeholder/400/400?text=TM+MG4',
    description: 'Spin Tread technology',
    isVerified: true
  },

  // Callaway
  {
    id: 'callaway-jaws-raw-2023',
    brand: 'Callaway',
    model: 'Jaws Raw',
    category: 'wedge',
    year: 2023,
    msrp: 169,
    image: '/api/placeholder/400/400?text=Callaway+Jaws+Raw',
    description: 'Raw face for maximum spin',
    isVerified: true
  },

  // Cleveland
  {
    id: 'cleveland-rtx6-zipcore-2023',
    brand: 'Cleveland',
    model: 'RTX 6 ZipCore',
    category: 'wedge',
    year: 2023,
    msrp: 169,
    image: '/api/placeholder/400/400?text=Cleveland+RTX6',
    description: 'Revolutionary core design',
    isVerified: true
  },

  // Ping
  {
    id: 'ping-glide4-2023',
    brand: 'Ping',
    model: 'Glide 4.0',
    category: 'wedge',
    year: 2023,
    msrp: 169,
    image: '/api/placeholder/400/400?text=Ping+Glide+4',
    description: 'Emery blast for consistent spin',
    isVerified: true
  }
];

// PUTTERS (2022-2024)
export const putters: Equipment[] = [
  // Scotty Cameron
  {
    id: 'scotty-newport2-2023',
    brand: 'Scotty Cameron',
    model: 'Newport 2',
    category: 'putter',
    year: 2023,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Scotty+Newport+2',
    description: 'The most iconic putter in golf',
    specs: {
      lengths: ['33"', '34"', '35"'],
      toe_flow: 'Slight Arc',
      head_weight: '340g'
    },
    isVerified: true
  },
  {
    id: 'scotty-newport2-plus-2023',
    brand: 'Scotty Cameron',
    model: 'Newport 2 Plus',
    category: 'putter',
    year: 2023,
    msrp: 629,
    image: '/api/placeholder/400/400?text=Scotty+Newport+2+Plus',
    description: 'Larger profile for stability',
    isVerified: true
  },
  {
    id: 'scotty-phantom-x5-2022',
    brand: 'Scotty Cameron',
    model: 'Phantom X 5',
    category: 'putter',
    year: 2022,
    msrp: 599,
    image: '/api/placeholder/400/400?text=Scotty+Phantom+X5',
    description: 'Modern mallet design',
    isVerified: true
  },
  {
    id: 'scotty-phantom-11-2024',
    brand: 'Scotty Cameron',
    model: 'Phantom 11',
    category: 'putter',
    year: 2024,
    msrp: 629,
    image: '/api/placeholder/400/400?text=Scotty+Phantom+11',
    description: 'High MOI mallet',
    isVerified: true
  },

  // Odyssey
  {
    id: 'odyssey-white-hot-og-2022',
    brand: 'Odyssey',
    model: 'White Hot OG',
    category: 'putter',
    year: 2022,
    msrp: 299,
    image: '/api/placeholder/400/400?text=Odyssey+White+Hot+OG',
    description: 'Classic White Hot insert',
    isVerified: true
  },
  {
    id: 'odyssey-ai-one-2024',
    brand: 'Odyssey',
    model: 'Ai-ONE',
    category: 'putter',
    year: 2024,
    msrp: 399,
    image: '/api/placeholder/400/400?text=Odyssey+Ai+ONE',
    description: 'AI designed insert',
    isVerified: true
  },

  // TaylorMade
  {
    id: 'taylormade-spider-tour-2023',
    brand: 'TaylorMade',
    model: 'Spider Tour',
    category: 'putter',
    year: 2023,
    msrp: 399,
    image: '/api/placeholder/400/400?text=TM+Spider+Tour',
    description: 'Tour-proven stability',
    isVerified: true
  },
  {
    id: 'taylormade-tp-hydro-blast-2022',
    brand: 'TaylorMade',
    model: 'TP Hydro Blast',
    category: 'putter',
    year: 2022,
    msrp: 299,
    image: '/api/placeholder/400/400?text=TM+Hydro+Blast',
    description: 'Premium hydro blast finish',
    isVerified: true
  },

  // Ping
  {
    id: 'ping-pld-anser-2023',
    brand: 'Ping',
    model: 'PLD Anser',
    category: 'putter',
    year: 2023,
    msrp: 450,
    image: '/api/placeholder/400/400?text=Ping+PLD+Anser',
    description: 'Precision milled classic',
    isVerified: true
  },
  {
    id: 'ping-ds72-2024',
    brand: 'Ping',
    model: 'DS72',
    category: 'putter',
    year: 2024,
    msrp: 475,
    image: '/api/placeholder/400/400?text=Ping+DS72',
    description: 'Tour-inspired blade',
    isVerified: true
  },

  // LAB Golf
  {
    id: 'lab-df3-2023',
    brand: 'L.A.B. Golf',
    model: 'DF3',
    category: 'putter',
    year: 2023,
    msrp: 449,
    image: '/api/placeholder/400/400?text=LAB+DF3',
    description: 'Lie Angle Balanced technology',
    isVerified: true
  },
  {
    id: 'lab-link1-2024',
    brand: 'L.A.B. Golf',
    model: 'Link.1',
    category: 'putter',
    year: 2024,
    msrp: 399,
    image: '/api/placeholder/400/400?text=LAB+Link+1',
    description: 'Broomstick alternative',
    isVerified: true
  },

  // Bettinardi
  {
    id: 'bettinardi-qp-2023',
    brand: 'Bettinardi',
    model: 'Queen B 6',
    category: 'putter',
    year: 2023,
    msrp: 600,
    image: '/api/placeholder/400/400?text=Bettinardi+QB6',
    description: 'Precision milled in USA',
    isVerified: true
  }
];

// GOLF BALLS (2022-2024)
export const balls: Equipment[] = [
  // Titleist
  {
    id: 'titleist-prov1-2023',
    brand: 'Titleist',
    model: 'Pro V1',
    category: 'ball',
    year: 2023,
    msrp: 55,
    image: '/api/placeholder/400/400?text=Titleist+Pro+V1',
    description: 'The #1 ball in golf',
    specs: {
      construction: '3-piece',
      compression: 87,
      dimples: 388
    },
    isVerified: true
  },
  {
    id: 'titleist-prov1x-2023',
    brand: 'Titleist',
    model: 'Pro V1x',
    category: 'ball',
    year: 2023,
    msrp: 55,
    image: '/api/placeholder/400/400?text=Titleist+Pro+V1x',
    description: 'Higher flight, firmer feel',
    specs: {
      construction: '4-piece',
      compression: 97,
      dimples: 348
    },
    isVerified: true
  },
  {
    id: 'titleist-avx-2024',
    brand: 'Titleist',
    model: 'AVX',
    category: 'ball',
    year: 2024,
    msrp: 50,
    image: '/api/placeholder/400/400?text=Titleist+AVX',
    description: 'Low flight, soft feel',
    isVerified: true
  },

  // TaylorMade
  {
    id: 'taylormade-tp5-2024',
    brand: 'TaylorMade',
    model: 'TP5',
    category: 'ball',
    year: 2024,
    msrp: 50,
    image: '/api/placeholder/400/400?text=TM+TP5',
    description: '5-layer tour ball',
    specs: {
      construction: '5-piece',
      compression: 85,
      dimples: 322
    },
    isVerified: true
  },
  {
    id: 'taylormade-tp5x-2024',
    brand: 'TaylorMade',
    model: 'TP5x',
    category: 'ball',
    year: 2024,
    msrp: 50,
    image: '/api/placeholder/400/400?text=TM+TP5x',
    description: 'Fastest 5-layer tour ball',
    isVerified: true
  },

  // Callaway
  {
    id: 'callaway-chrome-soft-2024',
    brand: 'Callaway',
    model: 'Chrome Soft',
    category: 'ball',
    year: 2024,
    msrp: 50,
    image: '/api/placeholder/400/400?text=Callaway+Chrome+Soft',
    description: 'Tour performance with soft feel',
    isVerified: true
  },

  // Bridgestone
  {
    id: 'bridgestone-tour-bx-2024',
    brand: 'Bridgestone',
    model: 'Tour B X',
    category: 'ball',
    year: 2024,
    msrp: 50,
    image: '/api/placeholder/400/400?text=Bridgestone+Tour+BX',
    description: 'Ideal for 105+ mph swing speed',
    isVerified: true
  },

  // Srixon
  {
    id: 'srixon-zstar-2023',
    brand: 'Srixon',
    model: 'Z-Star',
    category: 'ball',
    year: 2023,
    msrp: 43,
    image: '/api/placeholder/400/400?text=Srixon+Z+Star',
    description: 'Tour performance value',
    isVerified: true
  }
];

// GOLF BAGS (2022-2024)
export const bags: Equipment[] = [
  // Staff Bags
  {
    id: 'titleist-players-4-staff-2023',
    brand: 'Titleist',
    model: 'Players 4 Staff',
    category: 'bag',
    year: 2023,
    msrp: 650,
    image: '/api/placeholder/400/400?text=Titleist+Staff+Bag',
    description: 'Tour-inspired staff bag',
    specs: {
      weight: '9.5 lbs',
      dividers: 4,
      pockets: 9
    },
    isVerified: true
  },
  {
    id: 'taylormade-tour-staff-2023',
    brand: 'TaylorMade',
    model: 'Tour Staff',
    category: 'bag',
    year: 2023,
    msrp: 600,
    image: '/api/placeholder/400/400?text=TM+Tour+Staff',
    description: 'Premium tour bag',
    isVerified: true
  },

  // Stand Bags
  {
    id: 'vessel-player-4-2023',
    brand: 'Vessel',
    model: 'Player IV Pro',
    category: 'bag',
    year: 2023,
    msrp: 395,
    image: '/api/placeholder/400/400?text=Vessel+Player+IV',
    description: 'Premium materials and design',
    specs: {
      weight: '6.5 lbs',
      dividers: 6,
      pockets: 7
    },
    isVerified: true
  },
  {
    id: 'ping-hoofer-14-2023',
    brand: 'Ping',
    model: 'Hoofer 14',
    category: 'bag',
    year: 2023,
    msrp: 260,
    image: '/api/placeholder/400/400?text=Ping+Hoofer+14',
    description: 'The original walking bag',
    isVerified: true
  },
  {
    id: 'sun-mountain-cv1-2024',
    brand: 'Sun Mountain',
    model: 'C-130',
    category: 'bag',
    year: 2024,
    msrp: 280,
    image: '/api/placeholder/400/400?text=Sun+Mountain+C130',
    description: 'Ultimate carry comfort',
    isVerified: true
  },

  // Cart Bags
  {
    id: 'ogio-convoy-se-2023',
    brand: 'Ogio',
    model: 'Convoy SE',
    category: 'bag',
    year: 2023,
    msrp: 279,
    image: '/api/placeholder/400/400?text=Ogio+Convoy+SE',
    description: 'Military-inspired design',
    isVerified: true
  }
];

// COMMUNITY SUBMISSIONS (Example structure)
export const communitySubmissions: Equipment[] = [
  {
    id: 'community-ping-eye2',
    brand: 'Ping',
    model: 'Eye 2',
    category: 'iron',
    year: 1982,
    msrp: 0, // Vintage
    image: '/api/placeholder/400/400?text=Ping+Eye+2+Vintage',
    description: 'Classic cavity back irons',
    isVerified: false,
    submittedBy: 'vintage_golfer_82',
    specs: {
      note: 'Beryllium copper, legendary forgiveness'
    }
  },
  {
    id: 'community-titleist-681',
    brand: 'Titleist',
    model: '681',
    category: 'iron',
    year: 1990,
    msrp: 0,
    image: '/api/placeholder/400/400?text=Titleist+681+Vintage',
    description: 'Tour blade from the 90s',
    isVerified: false,
    submittedBy: 'blade_collector'
  },
  {
    id: 'community-custom-bettinardi',
    brand: 'Bettinardi',
    model: 'Custom DASS BB1',
    category: 'putter',
    year: 2023,
    msrp: 2500,
    image: '/api/placeholder/400/400?text=Custom+Bettinardi+DASS',
    description: 'One-off custom with skull pattern',
    isVerified: false,
    submittedBy: 'putter_addict'
  }
];

// Combined export
export const allEquipment: Equipment[] = [
  ...drivers,
  ...irons,
  ...wedges,
  ...putters,
  ...balls,
  ...bags,
  ...communitySubmissions
];

// Helper functions
export function getEquipmentById(id: string): Equipment | undefined {
  return allEquipment.find(item => item.id === id);
}

export function getEquipmentByCategory(category: string): Equipment[] {
  return allEquipment.filter(item => item.category === category);
}

export function getVerifiedEquipment(): Equipment[] {
  return allEquipment.filter(item => item.isVerified);
}

export function getCommunityEquipment(): Equipment[] {
  return allEquipment.filter(item => !item.isVerified);
}

export function searchEquipment(query: string): Equipment[] {
  const searchTerm = query.toLowerCase();
  return allEquipment.filter(item => 
    item.brand.toLowerCase().includes(searchTerm) ||
    item.model.toLowerCase().includes(searchTerm) ||
    item.description?.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm)
  );
}

export function filterEquipment(filters: {
  category?: string;
  brand?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
}): Equipment[] {
  return allEquipment.filter(item => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.brand && item.brand !== filters.brand) return false;
    if (filters.year && item.year !== filters.year) return false;
    if (filters.minPrice && item.msrp < filters.minPrice) return false;
    if (filters.maxPrice && item.msrp > filters.maxPrice) return false;
    if (filters.verified !== undefined && item.isVerified !== filters.verified) return false;
    return true;
  });
}

// Sample bag configurations
export const sampleBagConfigurations = {
  tourPro: {
    name: "Tour Pro Setup",
    items: [
      { equipmentId: 'tm-qi10-ls-2024', featured: true },
      { equipmentId: 'titleist-tsr3-2023', featured: true },
      { equipmentId: 'titleist-t100-2023', featured: true },
      { equipmentId: 'vokey-sm10-2024' },
      { equipmentId: 'scotty-newport2-2023', featured: true },
      { equipmentId: 'titleist-prov1x-2023' },
      { equipmentId: 'titleist-players-4-staff-2023' }
    ],
    totalValue: 7845
  },
  weekendWarrior: {
    name: "Weekend Warrior",
    items: [
      { equipmentId: 'cobra-darkspeed-2024', featured: true },
      { equipmentId: 'ping-g430-max-2023', featured: true },
      { equipmentId: 'callaway-apex-cb-2024', featured: true },
      { equipmentId: 'cleveland-rtx6-zipcore-2023' },
      { equipmentId: 'odyssey-ai-one-2024', featured: true },
      { equipmentId: 'callaway-chrome-soft-2024' },
      { equipmentId: 'ping-hoofer-14-2023' }
    ],
    totalValue: 4250
  }
};