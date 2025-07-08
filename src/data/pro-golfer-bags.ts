// Professional golfer bag setups based on 2024 tour data
export const proGolferBags = [
  {
    golferName: "Rory McIlroy",
    handicap: "+8.5",
    username: "rory_mcilroy",
    avatar: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop",
    bagName: "Rory's 2024 Setup",
    equipment: {
      driver: { brand: "TaylorMade", model: "Qi10", loft: "9°", shaft: "Fujikura Ventus Black 6X" },
      fairwayWoods: [
        { brand: "TaylorMade", model: "Qi10", loft: "15°", shaft: "Fujikura Ventus Black 8X" },
        { brand: "TaylorMade", model: "Qi10", loft: "19°", shaft: "Fujikura Ventus Black 9X" }
      ],
      irons: [
        { brand: "TaylorMade", model: "P760", lofts: "4-PW", shaft: "Project X Rifle 7.0" }
      ],
      wedges: [
        { brand: "TaylorMade", model: "MG4", loft: "50°", bounce: "9°" },
        { brand: "TaylorMade", model: "MG4", loft: "54°", bounce: "11°" },
        { brand: "TaylorMade", model: "MG4", loft: "60°", bounce: "8°" }
      ],
      putter: { brand: "TaylorMade", model: "Spider Tour X", length: "35\"" },
      ball: { brand: "TaylorMade", model: "TP5x" },
      bag: { brand: "TaylorMade", model: "Tour Staff Bag" },
      accessories: {
        glove: { brand: "TaylorMade", model: "Tour Preferred" },
        tees: { brand: "Zero Friction", model: "3-Prong Tour Tees" },
        rangefinder: { brand: "Bushnell", model: "Pro X3" }
      }
    }
  },
  {
    golferName: "Scottie Scheffler",
    handicap: "+9.0",
    username: "scottie_scheffler",
    avatar: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop",
    bagName: "World #1 Setup",
    equipment: {
      driver: { brand: "TaylorMade", model: "Qi10", loft: "8.5°", shaft: "Fujikura Ventus TR Black 6X" },
      fairwayWoods: [
        { brand: "TaylorMade", model: "Stealth 2", loft: "16.5°", shaft: "Fujikura Ventus Black 8X" }
      ],
      hybrids: [
        { brand: "TaylorMade", model: "Stealth 2", loft: "21°", shaft: "Graphite Design Tour AD IZ 95X" }
      ],
      irons: [
        { brand: "TaylorMade", model: "P7TW", lofts: "4-PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "Titleist", model: "Vokey SM9", loft: "50°", bounce: "12F" },
        { brand: "Titleist", model: "Vokey SM9", loft: "56°", bounce: "10S" },
        { brand: "Titleist", model: "Vokey SM9", loft: "60°", bounce: "8M" }
      ],
      putter: { brand: "Scotty Cameron", model: "Phantom X 5", length: "35\"" },
      ball: { brand: "Titleist", model: "Pro V1" },
      bag: { brand: "Titleist", model: "Players 4 StaDry" },
      accessories: {
        glove: { brand: "Titleist", model: "Players Flex" },
        tees: { brand: "Pride", model: "Professional Tees" },
        rangefinder: { brand: "Bushnell", model: "Tour V6 Shift" }
      }
    }
  },
  {
    golferName: "Jon Rahm",
    handicap: "+8.8",
    username: "jon_rahm",
    avatar: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop",
    bagName: "Spanish Armada",
    equipment: {
      driver: { brand: "Callaway", model: "Paradym Triple Diamond", loft: "10.5°", shaft: "Aldila Tour Green 75TX" },
      fairwayWoods: [
        { brand: "Callaway", model: "Paradym", loft: "15°", shaft: "Aldila Tour Green 85TX" },
        { brand: "Callaway", model: "Paradym", loft: "18°", shaft: "Aldila Tour Green 85TX" }
      ],
      irons: [
        { brand: "Callaway", model: "Apex TCB", lofts: "4-PW", shaft: "Project X Rifle 6.5" }
      ],
      wedges: [
        { brand: "Callaway", model: "Jaws Raw", loft: "52°", bounce: "10°" },
        { brand: "Callaway", model: "Jaws Raw", loft: "56°", bounce: "12°" },
        { brand: "Callaway", model: "Jaws Raw", loft: "60°", bounce: "10°" }
      ],
      putter: { brand: "Odyssey", model: "White Hot OG Rossie", length: "35\"" },
      ball: { brand: "Callaway", model: "Chrome Soft X" },
      bag: { brand: "Callaway", model: "Tour Authentic Staff Bag" },
      accessories: {
        glove: { brand: "Callaway", model: "Tour Authentic" },
        tees: { brand: "4 Yards More", model: "Golf Tees" },
        rangefinder: { brand: "Bushnell", model: "Pro XE" }
      }
    }
  },
  {
    golferName: "Viktor Hovland",
    handicap: "+8.2",
    username: "viktor_hovland",
    avatar: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop",
    bagName: "Norwegian Thunder",
    equipment: {
      driver: { brand: "Ping", model: "G430 LST", loft: "9°", shaft: "Fujikura Ventus TR Blue 6X" },
      fairwayWoods: [
        { brand: "Ping", model: "G430 LST", loft: "15°", shaft: "Fujikura Ventus Blue 7X" }
      ],
      hybrids: [
        { brand: "Ping", model: "G430", loft: "19°", shaft: "Fujikura Ventus Blue 8X" }
      ],
      irons: [
        { brand: "Ping", model: "i230", lofts: "3-PW", shaft: "KBS Tour 130 X" }
      ],
      wedges: [
        { brand: "Ping", model: "Glide 4.0", loft: "50°", bounce: "10°" },
        { brand: "Ping", model: "Glide 4.0", loft: "56°", bounce: "12°" },
        { brand: "Ping", model: "Glide 4.0", loft: "60°", bounce: "10°" }
      ],
      putter: { brand: "Ping", model: "PLD Anser 2", length: "34\"" },
      ball: { brand: "Titleist", model: "Pro V1" },
      bag: { brand: "Ping", model: "Tour Staff Bag" },
      accessories: {
        glove: { brand: "FootJoy", model: "Pure Touch Limited" },
        tees: { brand: "Pride", model: "Professional Tees" },
        speaker: { brand: "Bushnell", model: "Wingman Mini" }
      }
    }
  },
  {
    golferName: "Xander Schauffele",
    handicap: "+8.4",
    username: "xander_schauffele",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    bagName: "Olympic Gold Setup",
    equipment: {
      driver: { brand: "Callaway", model: "Paradym Triple Diamond", loft: "10.5°", shaft: "Fujikura Ventus Blue 6X" },
      fairwayWoods: [
        { brand: "Callaway", model: "Paradym Triple Diamond", loft: "15°", shaft: "Mitsubishi Tensei CK Pro White 80TX" }
      ],
      hybrids: [
        { brand: "Callaway", model: "Apex UW", loft: "20°", shaft: "KBS Prototype Graphite 95X" }
      ],
      irons: [
        { brand: "Callaway", model: "X Forged UT", loft: "18°", shaft: "Project X HZRDUS Black 100 6.5" },
        { brand: "Callaway", model: "Apex Pro", lofts: "5-PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "Callaway", model: "Jaws Raw", loft: "50°", bounce: "10°" },
        { brand: "Callaway", model: "Jaws Raw", loft: "56°", bounce: "12°" },
        { brand: "Callaway", model: "Jaws Raw", loft: "60°", bounce: "10°" }
      ],
      putter: { brand: "Odyssey", model: "Toulon Design San Diego", length: "34\"" },
      ball: { brand: "Callaway", model: "Chrome Soft X" },
      bag: { brand: "Callaway", model: "Tour Staff Bag" },
      accessories: {
        glove: { brand: "Callaway", model: "Tour Authentic" },
        tees: { brand: "4 Yards More", model: "Golf Tees" },
        towel: { brand: "Callaway", model: "Tour Authentic Towel" }
      }
    }
  },
  {
    golferName: "Collin Morikawa",
    handicap: "+8.6",
    username: "collin_morikawa",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    bagName: "Iron Master",
    equipment: {
      driver: { brand: "TaylorMade", model: "Stealth 2 Plus", loft: "8.5°", shaft: "Mitsubishi Diamana D+ Limited 70TX" },
      fairwayWoods: [
        { brand: "TaylorMade", model: "Stealth 2", loft: "16.5°", shaft: "Mitsubishi Diamana D+ Limited 80TX" }
      ],
      hybrids: [
        { brand: "TaylorMade", model: "Stealth", loft: "19.5°", shaft: "Mitsubishi Diamana Thump 100X" }
      ],
      irons: [
        { brand: "TaylorMade", model: "P7MC", lofts: "4-PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "TaylorMade", model: "MG3", loft: "50°", bounce: "9°" },
        { brand: "TaylorMade", model: "MG3", loft: "56°", bounce: "12°" },
        { brand: "TaylorMade", model: "MG3", loft: "60°", bounce: "11°" }
      ],
      putter: { brand: "TaylorMade", model: "TP Soto", length: "34.5\"" },
      ball: { brand: "TaylorMade", model: "TP5" },
      bag: { brand: "TaylorMade", model: "Tour Staff Bag" },
      accessories: {
        glove: { brand: "TaylorMade", model: "Tour Preferred" },
        tees: { brand: "Zero Friction", model: "Tour 3-Prong" },
        alignment_sticks: { brand: "Tour Sticks", model: "Alignment Sticks" }
      }
    }
  },
  {
    golferName: "Justin Thomas",
    handicap: "+8.7",
    username: "justin_thomas",
    avatar: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop",
    bagName: "JT's Weapons",
    equipment: {
      driver: { brand: "Titleist", model: "TSR3", loft: "9°", shaft: "Fujikura Ventus Black 7X" },
      fairwayWoods: [
        { brand: "Titleist", model: "TSR3", loft: "15°", shaft: "Fujikura Ventus Blue 8X" },
        { brand: "Titleist", model: "TSR2", loft: "18°", shaft: "Graphite Design Tour AD DI 9X" }
      ],
      irons: [
        { brand: "Titleist", model: "T100", lofts: "4-9", shaft: "True Temper Dynamic Gold Tour Issue X100" },
        { brand: "Titleist", model: "620 MB", loft: "PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "Titleist", model: "Vokey SM9", loft: "46°", bounce: "10F" },
        { brand: "Titleist", model: "Vokey SM9", loft: "52°", bounce: "12F" },
        { brand: "Titleist", model: "Vokey SM9", loft: "56°", bounce: "10S" },
        { brand: "Titleist", model: "Vokey SM9", loft: "60°", bounce: "4L" }
      ],
      putter: { brand: "Scotty Cameron", model: "Phantom X 5.5", length: "35\"" },
      ball: { brand: "Titleist", model: "Pro V1x" },
      bag: { brand: "Titleist", model: "Players 4 Plus StaDry" },
      accessories: {
        glove: { brand: "Titleist", model: "Players Flex" },
        tees: { brand: "Pride", model: "Professional Tees" },
        headcover: { brand: "Scotty Cameron", model: "Custom Headcovers" }
      }
    }
  },
  {
    golferName: "Jordan Spieth",
    handicap: "+8.3",
    username: "jordan_spieth",
    avatar: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop",
    bagName: "Texas Forever",
    equipment: {
      driver: { brand: "Titleist", model: "TSR2", loft: "10°", shaft: "Fujikura Ventus Blue 6X" },
      fairwayWoods: [
        { brand: "Titleist", model: "TSR3", loft: "15°", shaft: "Fujikura Ventus Blue 7X" }
      ],
      hybrids: [
        { brand: "Titleist", model: "TSi2", loft: "21°", shaft: "Graphite Design Tour AD IZ 95X" }
      ],
      irons: [
        { brand: "Titleist", model: "T200", loft: "4-iron", shaft: "True Temper Dynamic Gold Tour Issue X100" },
        { brand: "Titleist", model: "T100", lofts: "5-9", shaft: "True Temper Dynamic Gold Tour Issue X100" },
        { brand: "Titleist", model: "Vokey SM9", loft: "46°", shaft: "True Temper Dynamic Gold Tour Issue S400" }
      ],
      wedges: [
        { brand: "Titleist", model: "Vokey SM9", loft: "52°", bounce: "8F" },
        { brand: "Titleist", model: "Vokey SM9", loft: "56°", bounce: "10S" },
        { brand: "Titleist", model: "Vokey SM9", loft: "60°", bounce: "8M" }
      ],
      putter: { brand: "Scotty Cameron", model: "Circle T 009", length: "35\"" },
      ball: { brand: "Titleist", model: "Pro V1x" },
      bag: { brand: "Titleist", model: "Players 4 StaDry" },
      accessories: {
        glove: { brand: "Under Armour", model: "Spieth Tour" },
        tees: { brand: "Pride", model: "Professional Tees" },
        yardage_book: { brand: "GolfLogix", model: "Green Books" }
      }
    }
  },
  {
    golferName: "Patrick Cantlay",
    handicap: "+8.5",
    username: "patrick_cantlay",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    bagName: "Calculated Precision",
    equipment: {
      driver: { brand: "Titleist", model: "TSR3", loft: "10°", shaft: "Fujikura Ventus Black 6X" },
      fairwayWoods: [
        { brand: "Titleist", model: "TSR3", loft: "16.5°", shaft: "Fujikura Ventus Black 8X" }
      ],
      irons: [
        { brand: "Titleist", model: "718 MB", lofts: "4-PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "Titleist", model: "Vokey SM8", loft: "50°", bounce: "12F" },
        { brand: "Titleist", model: "Vokey SM8", loft: "54°", bounce: "10S" },
        { brand: "Titleist", model: "Vokey SM8", loft: "60°", bounce: "4L" }
      ],
      putter: { brand: "Scotty Cameron", model: "Phantom X 11.5", length: "35\"" },
      ball: { brand: "Titleist", model: "Pro V1" },
      bag: { brand: "Titleist", model: "Players 4 Plus" },
      accessories: {
        glove: { brand: "Titleist", model: "Players Flex" },
        tees: { brand: "4 Yards More", model: "Golf Tees" },
        towel: { brand: "Titleist", model: "Players Towel" }
      }
    }
  },
  {
    golferName: "Dustin Johnson",
    handicap: "+8.9",
    username: "dustin_johnson",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    bagName: "DJ's Bombers",
    equipment: {
      driver: { brand: "TaylorMade", model: "Stealth 2 Plus", loft: "10.5°", shaft: "Fujikura Speeder 661 X" },
      fairwayWoods: [
        { brand: "TaylorMade", model: "Stealth 2", loft: "16.5°", shaft: "Aldila Tour Green 85TX" },
        { brand: "TaylorMade", model: "Stealth 2", loft: "21°", shaft: "Aldila Tour Green 95TX" }
      ],
      irons: [
        { brand: "TaylorMade", model: "P730", lofts: "3-PW", shaft: "True Temper Dynamic Gold Tour Issue X100" }
      ],
      wedges: [
        { brand: "TaylorMade", model: "MG3", loft: "52°", bounce: "9°" },
        { brand: "TaylorMade", model: "MG3", loft: "60°", bounce: "11°" }
      ],
      putter: { brand: "TaylorMade", model: "Spider Tour Limited", length: "35.75\"" },
      ball: { brand: "TaylorMade", model: "TP5x" },
      bag: { brand: "TaylorMade", model: "Tour Staff Bag" },
      accessories: {
        glove: { brand: "TaylorMade", model: "Tour Preferred" },
        tees: { brand: "Zero Friction", model: "3-Prong Tour Tees" },
        sunglasses: { brand: "Adidas", model: "Tour Sunglasses" }
      }
    }
  }
];