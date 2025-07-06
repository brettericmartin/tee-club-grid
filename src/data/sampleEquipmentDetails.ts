import { EquipmentDetail, ShaftOption, GripOption } from "@/types/equipmentDetail";
import taylormadeDriver from "@/assets/equipment/taylormade-stealth2-driver.jpg";
import titleistIrons from "@/assets/equipment/titleist-t100-irons.jpg";
import scottyPutter from "@/assets/equipment/scotty-newport2.jpg";
import vokeyWedge from "@/assets/equipment/vokey-wedge.jpg";
import callaway3Wood from "@/assets/equipment/callaway-3wood.jpg";
import titleistBall from "@/assets/equipment/titleist-prov1.jpg";

// Sample shaft options
const sampleShafts: ShaftOption[] = [
  {
    id: 'ventus-black-6x',
    brand: 'Fujikura',
    model: 'Ventus Black',
    flex: '6X',
    weight: '65g',
    price: 450,
    imageUrl: '/shafts/ventus-black.jpg',
    isStock: false
  },
  {
    id: 'project-x-hzrdus',
    brand: 'Project X',
    model: 'HZRDUS Smoke',
    flex: '6.5',
    weight: '70g',
    price: 400,
    imageUrl: '/shafts/hzrdus-smoke.jpg',
    isStock: false
  },
  {
    id: 'aldila-rogue',
    brand: 'Aldila',
    model: 'Rogue Silver',
    flex: 'Stiff',
    weight: '70g',
    price: 350,
    imageUrl: '/shafts/rogue-silver.jpg',
    isStock: false
  },
  {
    id: 'stock-shaft',
    brand: 'TaylorMade',
    model: 'Tensei AV Blue',
    flex: 'Stiff',
    weight: '65g',
    price: 0,
    imageUrl: '/shafts/tensei-av-blue.jpg',
    isStock: true
  }
];

// Sample grip options
const sampleGrips: GripOption[] = [
  {
    id: 'golf-pride-tour-velvet',
    brand: 'Golf Pride',
    model: 'Tour Velvet',
    size: 'Standard',
    price: 0,
    imageUrl: '/grips/tour-velvet.jpg',
    isStock: true
  },
  {
    id: 'golf-pride-mcc',
    brand: 'Golf Pride',
    model: 'MCC',
    size: 'Standard',
    price: 15,
    imageUrl: '/grips/mcc.jpg',
    isStock: false
  },
  {
    id: 'lamkin-crossline',
    brand: 'Lamkin',
    model: 'Crossline',
    size: 'Standard',
    price: 12,
    imageUrl: '/grips/crossline.jpg',
    isStock: false
  },
  {
    id: 'golf-pride-cp2-wrap',
    brand: 'Golf Pride',
    model: 'CP2 Wrap',
    size: 'Midsize',
    price: 18,
    imageUrl: '/grips/cp2-wrap.jpg',
    isStock: false
  }
];

export const sampleEquipmentDetails: Record<string, EquipmentDetail> = {
  'e1': {
    id: 'e1',
    brand: 'TaylorMade',
    model: 'Stealth 2',
    category: 'Driver',
    specs: {
      loft: '9.5°',
      lie: '58°',
      length: '45.75"',
      headSize: '460cc',
      material: 'Carbon Fiber Face'
    },
    msrp: 599,
    description: 'The TaylorMade Stealth 2 Driver features a revolutionary 60X Carbon Twist Face that is 11% lighter than titanium while maintaining strength and durability. This weight savings allowed engineers to redistribute mass for enhanced forgiveness and optimal launch conditions.',
    features: [
      '60X Carbon Twist Face for enhanced forgiveness',
      'Asymmetric Inertia Generator for improved aerodynamics',
      'Advanced ICT for optimized face thickness',
      'Adjustable loft sleeve (±2°)',
      'Premium sound engineering'
    ],
    images: [taylormadeDriver, taylormadeDriver, taylormadeDriver],
    popularShafts: sampleShafts,
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: sampleShafts[0], // Ventus Black 6X
      grip: sampleGrips[1], // Golf Pride MCC
      totalPrice: 1064 // 599 + 450 + 15
    },
    isFeatured: true
  },
  'tm-qi10-max': {
    id: 'tm-qi10-max',
    brand: 'TaylorMade',
    model: 'Qi10 Max',
    category: 'Driver',
    specs: {
      loft: '10.5°',
      lie: '58°',
      length: '45.75"',
      headSize: '460cc',
      material: 'Carbon Fiber Face'
    },
    msrp: 649,
    description: 'The TaylorMade Qi10 Max Driver features maximum forgiveness with a large head profile and high MOI design for improved consistency on off-center hits.',
    features: [
      'Maximum forgiveness design',
      'High MOI for stability',
      'Carbon Fiber Crown',
      'Adjustable loft sleeve',
      'Premium acoustics'
    ],
    images: [taylormadeDriver],
    popularShafts: sampleShafts,
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: sampleShafts[3], // Stock shaft
      grip: sampleGrips[0], // Tour Velvet
      totalPrice: 649
    },
    isFeatured: false
  },
  'titleist-t100': {
    id: 'titleist-t100',
    brand: 'Titleist',
    model: 'T100',
    category: 'Iron Set',
    specs: {
      loft: '4-PW',
      lie: 'Standard',
      length: 'Standard',
      material: 'Forged Carbon Steel'
    },
    msrp: 1400,
    description: 'The Titleist T100 irons represent the ultimate players distance iron, combining tour-proven performance with enhanced forgiveness.',
    features: [
      'Forged carbon steel construction',
      'Engineered muscle plate for enhanced feel',
      'Tour-proven performance',
      'Optimized center of gravity',
      'Maximum workability'
    ],
    images: [titleistIrons],
    popularShafts: sampleShafts,
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: sampleShafts[0],
      grip: sampleGrips[1],
      totalPrice: 1695
    },
    isFeatured: false
  },
  'vokey-sm10': {
    id: 'vokey-sm10',
    brand: 'Titleist',
    model: 'Vokey SM10',
    category: 'Wedge',
    specs: {
      loft: '56°',
      lie: '64°',
      length: '35.5"'
    },
    msrp: 189,
    description: 'The Titleist Vokey SM10 wedges deliver exceptional spin, control, and versatility around the greens with tour-proven performance.',
    features: [
      'Enhanced spin grooves',
      'Multiple grind options',
      'Tour-proven design',
      'Premium materials',
      'Exceptional feel'
    ],
    images: [vokeyWedge],
    popularShafts: [],
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: {
        id: 'wedge-shaft',
        brand: 'Titleist',
        model: 'Steel Shaft',
        flex: 'Wedge',
        weight: 'Standard',
        price: 0,
        imageUrl: '',
        isStock: true
      },
      grip: sampleGrips[0],
      totalPrice: 189
    },
    isFeatured: false
  },
  'scotty-phantom-x5': {
    id: 'scotty-phantom-x5',
    brand: 'Scotty Cameron',
    model: 'Phantom X5',
    category: 'Putter',
    specs: {
      loft: '3.5°',
      lie: '70°',
      length: '34"',
      headSize: 'Mid-mallet'
    },
    msrp: 469,
    description: 'The Scotty Cameron Phantom X5 putter features a modern mallet design with enhanced alignment features and exceptional feel.',
    features: [
      'Mallet design for stability',
      'Enhanced alignment features',
      'Premium materials',
      'Tour-proven performance',
      'Exceptional feel and feedback'
    ],
    images: [scottyPutter],
    popularShafts: [],
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: {
        id: 'putter-shaft',
        brand: 'Scotty Cameron',
        model: 'Steel Shaft',
        flex: 'N/A',
        weight: 'N/A',
        price: 0,
        imageUrl: '',
        isStock: true
      },
      grip: sampleGrips[0],
      totalPrice: 469
    },
    isFeatured: false
  },
  'e3': {
    id: 'e3',
    brand: 'Titleist',
    model: 'T100',
    category: 'Iron Set',
    specs: {
      loft: '4-PW',
      lie: 'Standard',
      length: 'Standard',
      material: 'Forged Carbon Steel'
    },
    msrp: 1400,
    description: 'The Titleist T100 irons represent the ultimate players distance iron, combining tour-proven performance with enhanced forgiveness. Featuring a forged carbon steel construction with precise weighting for optimal feel and control.',
    features: [
      'Forged carbon steel construction',
      'Engineered muscle plate for enhanced feel',
      'Tour-proven performance',
      'Optimized center of gravity',
      'Maximum workability'
    ],
    images: [titleistIrons, titleistIrons],
    popularShafts: [
      {
        id: 'project-x-6',
        brand: 'True Temper',
        model: 'Project X',
        flex: '6.0',
        weight: '130g',
        price: 280,
        imageUrl: '/shafts/project-x.jpg',
        isStock: false
      },
      {
        id: 'dynamic-gold-120',
        brand: 'True Temper',
        model: 'Dynamic Gold',
        flex: 'S300',
        weight: '130g',
        price: 200,
        imageUrl: '/shafts/dynamic-gold.jpg',
        isStock: false
      },
      {
        id: 'stock-iron-shaft',
        brand: 'Titleist',
        model: 'Stock Steel',
        flex: 'Regular',
        weight: '115g',
        price: 0,
        imageUrl: '/shafts/stock-steel.jpg',
        isStock: true
      }
    ],
    popularGrips: sampleGrips,
    currentBuild: {
      shaft: {
        id: 'project-x-6',
        brand: 'True Temper',
        model: 'Project X',
        flex: '6.0',
        weight: '130g',
        price: 280,
        imageUrl: '/shafts/project-x.jpg',
        isStock: false
      },
      grip: sampleGrips[1], // Golf Pride MCC
      totalPrice: 1695 // 1400 + 280 + 15
    },
    isFeatured: true
  },
  'e7': {
    id: 'e7',
    brand: 'Scotty Cameron',
    model: 'Newport 2',
    category: 'Putter',
    specs: {
      loft: '3.5°',
      lie: '70°',
      length: '34"',
      headSize: 'Mid-mallet'
    },
    msrp: 450,
    description: 'The Scotty Cameron Newport 2 is a timeless blade putter featuring precision milled 303 stainless steel construction. This tour-proven design offers exceptional feel and alignment for golfers who prefer a classic blade style.',
    features: [
      'Precision milled 303 stainless steel',
      'Tour-proven blade design',
      'Customizable sole weights',
      'Premium Matador grip',
      'Exceptional feel and feedback'
    ],
    images: [scottyPutter, scottyPutter],
    popularShafts: [], // Putters don't typically have shaft options
    popularGrips: [
      {
        id: 'scotty-matador',
        brand: 'Scotty Cameron',
        model: 'Matador',
        size: 'Standard',
        price: 0,
        imageUrl: '/grips/matador.jpg',
        isStock: true
      },
      {
        id: 'super-stroke-slim',
        brand: 'SuperStroke',
        model: 'Slim 3.0',
        size: 'Midsize',
        price: 35,
        imageUrl: '/grips/superstroke-slim.jpg',
        isStock: false
      }
    ],
    currentBuild: {
      shaft: {
        id: 'putter-shaft',
        brand: 'Scotty Cameron',
        model: 'Steel Shaft',
        flex: 'N/A',
        weight: 'N/A',
        price: 0,
        imageUrl: '',
        isStock: true
      },
      grip: {
        id: 'scotty-matador',
        brand: 'Scotty Cameron',
        model: 'Matador',
        size: 'Standard',
        price: 0,
        imageUrl: '/grips/matador.jpg',
        isStock: false
      },
      totalPrice: 450
    },
    isFeatured: true
  }
};