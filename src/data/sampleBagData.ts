import { UserBag, UserProfile } from "@/types/equipment";
import taylormadeDriver from "@/assets/equipment/taylormade-stealth2-driver.jpg";
import titleistIrons from "@/assets/equipment/titleist-t100-irons.jpg";
import scottyPutter from "@/assets/equipment/scotty-newport2.jpg";
import titleistBall from "@/assets/equipment/titleist-prov1.jpg";
import callaway3Wood from "@/assets/equipment/callaway-3wood.jpg";
import vokeyWedge from "@/assets/equipment/vokey-wedge.jpg";

export const sampleUserProfile: UserProfile = {
  id: 'user123',
  username: 'marcus_johnson',
  name: 'Marcus Johnson',
  handicap: 2,
  location: 'Scottsdale, AZ',
  avgScore: 74,
  roundsPlayed: 127,
  avatar: '/placeholder-avatar.jpg',
  bagBackground: 'midwest-lush'
};

// Demo users with different backgrounds for /bag/:username pages
export const demoUsers: UserProfile[] = [
  {
    id: 'user123',
    username: 'marcus-johnson',
    name: 'Marcus Johnson',
    handicap: 0,
    location: 'Scottsdale, AZ',
    avgScore: 70,
    roundsPlayed: 127,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'midwest-lush'
  },
  {
    id: 'user124',
    username: 'sarah-chen',
    name: 'Sarah Chen',
    handicap: 12,
    location: 'Pebble Beach, CA',
    avgScore: 84,
    roundsPlayed: 89,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'ocean'
  },
  {
    id: 'user125',
    username: 'mike-rodriguez',
    name: 'Mike Rodriguez',
    handicap: 18,
    location: 'Phoenix, AZ',
    avgScore: 92,
    roundsPlayed: 45,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'desert'
  },
  {
    id: 'user126',
    username: 'jennifer-park',
    name: 'Jennifer Park',
    handicap: 4,
    location: 'San Diego, CA',
    avgScore: 76,
    roundsPlayed: 156,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'ocean'
  },
  {
    id: 'user127',
    username: 'robert-thompson',
    name: 'Robert Thompson',
    handicap: 8,
    location: 'Denver, CO',
    avgScore: 80,
    roundsPlayed: 112,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'mountain'
  },
  {
    id: 'user128',
    username: 'alex-kim',
    name: 'Alex Kim',
    handicap: 6,
    location: 'Seattle, WA',
    avgScore: 78,
    roundsPlayed: 98,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'mountain'
  },
  {
    id: 'user129',
    username: 'emma-davis',
    name: 'Emma Davis',
    handicap: 25,
    location: 'Atlanta, GA',
    avgScore: 105,
    roundsPlayed: 23,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'midwest-lush'
  },
  {
    id: 'user130',
    username: 'william-foster',
    name: 'William Foster',
    handicap: 14,
    location: 'Tampa, FL',
    avgScore: 88,
    roundsPlayed: 67,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'ocean'
  },
  {
    id: 'user131',
    username: 'lisa-zhang',
    name: 'Lisa Zhang',
    handicap: 2,
    location: 'Los Angeles, CA',
    avgScore: 74,
    roundsPlayed: 134,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'desert'
  },
  {
    id: 'user132',
    username: 'chris-martinez',
    name: 'Chris Martinez',
    handicap: 16,
    location: 'Austin, TX',
    avgScore: 90,
    roundsPlayed: 56,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'desert'
  },
  {
    id: 'user133',
    username: 'david-lee',
    name: 'David Lee',
    handicap: 10,
    location: 'Portland, OR',
    avgScore: 82,
    roundsPlayed: 89,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'mountain'
  },
  {
    id: 'user134',
    username: 'jessica-brown',
    name: 'Jessica Brown',
    handicap: 20,
    location: 'Nashville, TN',
    avgScore: 94,
    roundsPlayed: 34,
    avatar: '/placeholder-avatar.jpg',
    bagBackground: 'midwest-lush'
  }
];

export const sampleUserBag: UserBag = {
  id: '1',
  userId: 'user123',
  name: 'Tournament Bag 2024',
  totalValue: 5847,
  featuredLayout: 'grid',
  items: [
    {
      equipment: {
        id: 'e1',
        brand: 'TaylorMade',
        model: 'Stealth 2',
        category: 'driver',
        image: taylormadeDriver,
        msrp: 599,
        customSpecs: '9.5° Loft',
        specs: {
          shaft: {
            brand: 'Fujikura',
            model: 'Ventus Black',
            flex: '6X',
            weight: '65g',
            price: 450,
            imageUrl: '/shafts/ventus-black.jpg',
            isStock: false
          },
          grip: {
            brand: 'Golf Pride',
            model: 'Tour Velvet',
            size: 'Standard',
            imageUrl: '/grips/tour-velvet.jpg',
            isStock: false
          }
        }
      },
      isFeatured: true,
      purchaseDate: '2024-01-15',
      customNotes: 'Love the feel and distance'
    },
    {
      equipment: {
        id: 'e2',
        brand: 'Callaway',
        model: 'Epic Speed',
        category: 'wood',
        image: callaway3Wood,
        msrp: 399,
        customSpecs: '15° Loft',
        specs: {
          shaft: {
            brand: 'Aldila',
            model: 'Rogue Silver',
            flex: 'Stiff',
            weight: '70g',
            imageUrl: '/shafts/rogue-silver.jpg',
            isStock: false
          },
          grip: {
            brand: 'Golf Pride',
            model: 'Tour Velvet',
            size: 'Standard',
            imageUrl: '/grips/tour-velvet.jpg',
            isStock: true
          }
        }
      },
      isFeatured: false
    },
    {
      equipment: {
        id: 'e3',
        brand: 'Titleist',
        model: 'T100',
        category: 'iron',
        image: titleistIrons,
        msrp: 1400,
        customSpecs: '4-PW (7 clubs)',
        specs: {
          shaft: {
            brand: 'True Temper',
            model: 'Project X',
            flex: '6.0',
            weight: '130g',
            imageUrl: '/shafts/project-x.jpg',
            isStock: false
          },
          grip: {
            brand: 'Golf Pride',
            model: 'MCC',
            size: 'Standard',
            imageUrl: '/grips/mcc.jpg',
            isStock: false
          }
        }
      },
      isFeatured: true,
      purchaseDate: '2024-02-20'
    },
    {
      equipment: {
        id: 'e4',
        brand: 'Titleist',
        model: 'Vokey SM9',
        category: 'wedge',
        image: vokeyWedge,
        msrp: 179,
        customSpecs: '52° F Grind'
      },
      isFeatured: false
    },
    {
      equipment: {
        id: 'e5',
        brand: 'Titleist',
        model: 'Vokey SM9',
        category: 'wedge',
        image: vokeyWedge,
        msrp: 179,
        customSpecs: '56° S Grind'
      },
      isFeatured: false
    },
    {
      equipment: {
        id: 'e6',
        brand: 'Titleist',
        model: 'Vokey SM9',
        category: 'wedge',
        image: vokeyWedge,
        msrp: 179,
        customSpecs: '60° L Grind'
      },
      isFeatured: true
    },
    {
      equipment: {
        id: 'e7',
        brand: 'Scotty Cameron',
        model: 'Newport 2',
        category: 'putter',
        image: scottyPutter,
        msrp: 599,
        customSpecs: '34" Length'
      },
      isFeatured: true,
      purchaseDate: '2023-12-10',
      customNotes: 'Best putter I\'ve ever owned'
    },
    {
      equipment: {
        id: 'e8',
        brand: 'Titleist',
        model: 'Pro V1',
        category: 'ball',
        image: titleistBall,
        msrp: 55
      },
      isFeatured: true
    }
  ]
};