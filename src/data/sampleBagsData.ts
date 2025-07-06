export interface BagData {
  id: string;
  title: string;
  owner: string;
  handicap: number;
  totalValue: number;
  clubCount: number;
  likeCount: number;
  followerCount: number;
  bagImage: string;
  equipmentImages: string[];
  featuredClubs: string[]; // Up to 6 equipment IDs for clubs only
  featuredAccessories: string[]; // Up to 4 equipment IDs for non-clubs
  isLiked?: boolean;
  isFollowing?: boolean;
  isTrending?: boolean;
  brands: string[];
  description?: string;
}

export const bagsBrowserData: BagData[] = [
  {
    id: "1",
    title: "Tour Pro's Arsenal",
    owner: "Marcus Johnson",
    handicap: 0,
    totalValue: 8500,
    clubCount: 14,
    likeCount: 523,
    followerCount: 189,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
    featuredAccessories: ["titleist-prov1", "footjoy-stasof", "titleist-players-4", "pride-pts"],
    isLiked: false,
    isFollowing: true,
    isTrending: true,
    brands: ["TaylorMade", "Titleist", "Scotty Cameron"],
    description: "Professional tournament setup"
  },
  {
    id: "2",
    title: "Weekend Warrior Setup",
    owner: "Sarah Chen",
    handicap: 12,
    totalValue: 3200,
    clubCount: 14,
    likeCount: 234,
    followerCount: 89,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["callaway-ai-smoke-max", "callaway-ai-smoke-fairway", "callaway-apex-hybrid", "ping-i230", "cleveland-rtx6", "odyssey-white-hot"],
    featuredAccessories: ["callaway-chrome-soft", "callaway-tour-authentic", "ping-hoofer-14"],
    isLiked: true,
    isFollowing: false,
    isTrending: false,
    brands: ["Callaway", "Ping", "Odyssey"],
    description: "Perfect for weekend rounds"
  },
  {
    id: "3",
    title: "Budget Friendly Build",
    owner: "Mike Rodriguez",
    handicap: 18,
    totalValue: 1800,
    clubCount: 12,
    likeCount: 156,
    followerCount: 34,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
    featuredAccessories: ["bridgestone-tour-bx", "tm-tour-preferred"],
    isLiked: false,
    isFollowing: false,
    isTrending: false,
    brands: ["Wilson", "Cleveland", "Top Flite"],
    description: "Great value without breaking the bank"
  },
  {
    id: "4",
    title: "Premium Performance",
    owner: "Jennifer Park",
    handicap: 4,
    totalValue: 6800,
    clubCount: 14,
    likeCount: 445,
    followerCount: 156,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
    featuredAccessories: ["titleist-prov1", "titleist-players", "callaway-fairway-14", "zero-friction"],
    isLiked: false,
    isFollowing: true,
    isTrending: true,
    brands: ["Mizuno", "Titleist", "L.A.B. Golf"],
    description: "Top-tier equipment for serious golfers"
  },
  {
    id: "5",
    title: "Classic Collection",
    owner: "Robert Thompson",
    handicap: 8,
    totalValue: 4500,
    clubCount: 14,
    likeCount: 298,
    followerCount: 76,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "vokey-sm10", "ping-pld-anser"],
    featuredAccessories: ["tm-tp5", "ping-hoofer-14"],
    isLiked: true,
    isFollowing: false,
    isTrending: false,
    brands: ["Ping", "TaylorMade", "Vokey"],
    description: "Time-tested clubs that perform"
  },
  {
    id: "6",
    title: "Modern Game Changer",
    owner: "Alex Kim",
    handicap: 6,
    totalValue: 5200,
    clubCount: 13,
    likeCount: 367,
    followerCount: 134,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "tm-p790", "tm-mg4", "tm-spider-tour"],
    featuredAccessories: ["srixon-z-star-xv", "callaway-tour-authentic", "tm-flextech-carry"],
    isLiked: false,
    isFollowing: false,
    isTrending: true,
    brands: ["Cobra", "Srixon", "Odyssey"],
    description: "Latest technology meets performance"
  },
  {
    id: "7",
    title: "Beginner's Best",
    owner: "Emma Davis",
    handicap: 25,
    totalValue: 1500,
    clubCount: 10,
    likeCount: 189,
    followerCount: 28,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
    featuredAccessories: ["wilson-duo-soft", "wilson-premium"],
    isLiked: false,
    isFollowing: false,
    isTrending: false,
    brands: ["Strata", "Wilson", "Ram"],
    description: "Perfect starter set for new golfers"
  },
  {
    id: "8",
    title: "Senior Tour Setup",
    owner: "William Foster",
    handicap: 14,
    totalValue: 3800,
    clubCount: 14,
    likeCount: 276,
    followerCount: 95,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "ping-pld-anser"],
    featuredAccessories: ["titleist-prov1", "titleist-players", "ping-hoofer-14"],
    isLiked: true,
    isFollowing: true,
    isTrending: false,
    brands: ["Cleveland", "Titleist", "Ping"],
    description: "Forgiving clubs for mature golfers"
  },
  {
    id: "9",
    title: "Ladies Pro Setup",
    owner: "Lisa Zhang",
    handicap: 2,
    totalValue: 7200,
    clubCount: 14,
    likeCount: 412,
    followerCount: 203,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "callaway-apex-pro", "vokey-sm10", "scotty-phantom-x5"],
    featuredAccessories: ["titleist-prov1", "callaway-tour-authentic", "tm-flextech-carry", "pride-pts"],
    isLiked: false,
    isFollowing: false,
    isTrending: true,
    brands: ["TaylorMade", "Callaway", "Scotty Cameron"],
    description: "Professional women's tournament bag"
  },
  {
    id: "10",
    title: "Distance Hunter",
    owner: "Chris Martinez",
    handicap: 16,
    totalValue: 2900,
    clubCount: 12,
    likeCount: 198,
    followerCount: 43,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["callaway-ai-smoke-max", "callaway-ai-smoke-fairway", "callaway-apex-hybrid", "callaway-apex-pro", "callaway-jaws-raw", "odyssey-white-hot"],
    featuredAccessories: ["bridgestone-tour-bx", "callaway-tour-authentic"],
    isLiked: false,
    isFollowing: false,
    isTrending: false,
    brands: ["Callaway", "TaylorMade", "Bridgestone"],
    description: "Optimized for maximum distance"
  },
  {
    id: "11",
    title: "Precision Putter",
    owner: "David Lee",
    handicap: 10,
    totalValue: 4100,
    clubCount: 14,
    likeCount: 334,
    followerCount: 112,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
    featuredAccessories: ["titleist-prov1", "titleist-players"],
    isLiked: true,
    isFollowing: true,
    isTrending: false,
    brands: ["Titleist", "Ping", "Scotty Cameron"],
    description: "Short game specialist setup"
  },
  {
    id: "12",
    title: "All Weather Warrior",
    owner: "Jessica Brown",
    handicap: 20,
    totalValue: 2600,
    clubCount: 13,
    likeCount: 167,
    followerCount: 51,
    bagImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop",
    equipmentImages: [
      "https://images.unsplash.com/photo-1592919505780-303950717480?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=150&h=150&fit=crop"
    ],
    featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
    featuredAccessories: ["wilson-duo-soft", "tm-tour-preferred"],
    isLiked: false,
    isFollowing: false,
    isTrending: false,
    brands: ["Wilson", "Cleveland", "Titleist"],
    description: "Reliable clubs for any conditions"
  }
];