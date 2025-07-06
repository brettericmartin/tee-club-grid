// Define post types
export type FeedPostType = 'bag_photo' | 'new_equipment' | 'equipment_showcase' | 'tournament_prep';

// Define the FeedItem interface
export interface FeedItem {
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandicap: number;
  postType: FeedPostType;
  imageUrl: string;
  caption: string;
  likes: number;
  commentCount: number;
  timestamp: Date;
  isFromFollowed: boolean;
  
  // For equipment updates
  equipmentAdded?: {
    name: string;
    brand: string;
    model: string;
  };
  
  // Reference to full bag data for flip side
  bagId: string;
  bagData?: {
    featuredClubs: string[];
    handicap: number;
    totalValue: number;
  };
}

// Helper function to create dates relative to now
const createTimestamp = (hoursAgo: number): Date => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
};

export const feedData: FeedItem[] = [
  {
    postId: '1',
    userId: 'marcus-johnson',
    userName: 'Marcus Johnson',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
    userHandicap: 0,
    postType: 'bag_photo',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=750&fit=crop',
    caption: 'Sunrise at Pebble Beach with my tournament setup. Ready to chase the dream! 🌅⛳',
    likes: 523,
    commentCount: 42,
    timestamp: createTimestamp(2),
    isFromFollowed: true,
    bagId: '1',
    bagData: {
      featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 0,
      totalValue: 8500
    }
  },
  {
    postId: '2',
    userId: 'jennifer-park',
    userName: 'Jennifer Park',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
    userHandicap: 4,
    postType: 'new_equipment',
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=600&h=750&fit=crop',
    caption: 'Just added these Vokey SM10 wedges to my bag! The spin is incredible. Paid $320 vs $380 MSRP 💪',
    likes: 287,
    commentCount: 34,
    timestamp: createTimestamp(4),
    isFromFollowed: true,
    bagId: '4',
    equipmentAdded: {
      name: 'Vokey SM10 Wedges',
      brand: 'Titleist',
      model: 'SM10'
    },
    bagData: {
      featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 4,
      totalValue: 6800
    }
  },
  {
    postId: '3',
    userId: 'alex-kim',
    userName: 'Alex Kim',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
    userHandicap: 6,
    postType: 'equipment_showcase',
    imageUrl: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=600&h=750&fit=crop',
    caption: 'Custom Scotty Cameron with hand-engraved alignment lines. Art meets performance 🎨',
    likes: 412,
    commentCount: 28,
    timestamp: createTimestamp(6),
    isFromFollowed: true,
    bagId: '6',
    bagData: {
      featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "tm-p790", "tm-mg4", "tm-spider-tour"],
      handicap: 6,
      totalValue: 5200
    }
  },
  {
    postId: '4',
    userId: 'chris-miller',
    userName: 'Chris Miller',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
    userHandicap: 28,
    postType: 'bag_photo',
    imageUrl: 'https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=600&h=750&fit=crop',
    caption: 'First time organizing my bag properly. Simple setup but it works for me! Any tips? 🙏',
    likes: 18,
    commentCount: 12,
    timestamp: createTimestamp(8),
    isFromFollowed: false,
    bagId: 'new-1',
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
      handicap: 28,
      totalValue: 1200
    }
  },
  {
    postId: '5',
    userId: 'lisa-zhang',
    userName: 'Lisa Zhang',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
    userHandicap: 2,
    postType: 'tournament_prep',
    imageUrl: 'https://images.unsplash.com/photo-1592919505780-303950717480?w=600&h=750&fit=crop',
    caption: 'Final prep for the club championship. Every detail dialed in to perfection 🏆',
    likes: 698,
    commentCount: 67,
    timestamp: createTimestamp(12),
    isFromFollowed: true,
    bagId: '9',
    bagData: {
      featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "callaway-apex-pro", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 2,
      totalValue: 7200
    }
  },
  {
    postId: '6',
    userId: 'david-lee',
    userName: 'David Lee',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
    userHandicap: 10,
    postType: 'new_equipment',
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=600&h=750&fit=crop',
    caption: 'Upgraded from 10-year-old irons to these beauties. The difference is night and day! 💥',
    likes: 156,
    commentCount: 23,
    timestamp: createTimestamp(18),
    isFromFollowed: true,
    bagId: '11',
    equipmentAdded: {
      name: 'T100 Irons',
      brand: 'Titleist',
      model: 'T100'
    },
    bagData: {
      featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 10,
      totalValue: 4100
    }
  },
  {
    postId: '7',
    userId: 'sarah-chen',
    userName: 'Sarah Chen',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b812c6d8?w=40&h=40&fit=crop',
    userHandicap: 12,
    postType: 'equipment_showcase',
    imageUrl: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=600&h=750&fit=crop',
    caption: 'Love the feel of my new Callaway driver. Distance and forgiveness in one package 🚀',
    likes: 89,
    commentCount: 15,
    timestamp: createTimestamp(24),
    isFromFollowed: true,
    bagId: '2',
    bagData: {
      featuredClubs: ["callaway-ai-smoke-max", "callaway-ai-smoke-fairway", "callaway-apex-hybrid", "ping-i230", "cleveland-rtx6", "odyssey-white-hot"],
      handicap: 12,
      totalValue: 3200
    }
  },
  {
    postId: '8',
    userId: 'mike-rodriguez',
    userName: 'Mike Rodriguez',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
    userHandicap: 18,
    postType: 'bag_photo',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=750&fit=crop',
    caption: 'Budget-friendly setup that punches above its weight. Proof you don\'t need to break the bank! 💰',
    likes: 234,
    commentCount: 31,
    timestamp: createTimestamp(36),
    isFromFollowed: false,
    bagId: '3',
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
      handicap: 18,
      totalValue: 1800
    }
  },
  {
    postId: '9',
    userId: 'emma-davis',
    userName: 'Emma Davis',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b812c6d8?w=40&h=40&fit=crop',
    userHandicap: 25,
    postType: 'new_equipment',
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=600&h=750&fit=crop',
    caption: 'Finally found a putter that works for me! Confidence is everything on the greens 🏌️‍♀️',
    likes: 67,
    commentCount: 8,
    timestamp: createTimestamp(42),
    isFromFollowed: false,
    bagId: '7',
    equipmentAdded: {
      name: 'PLD Anser Putter',
      brand: 'Ping',
      model: 'PLD Anser'
    },
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
      handicap: 25,
      totalValue: 1500
    }
  },
  {
    postId: '10',
    userId: 'robert-thompson',
    userName: 'Robert Thompson',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
    userHandicap: 8,
    postType: 'tournament_prep',
    imageUrl: 'https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=600&h=750&fit=crop',
    caption: 'Classic setup ready for the member-guest. Some things never go out of style ⌚',
    likes: 178,
    commentCount: 19,
    timestamp: createTimestamp(48),
    isFromFollowed: false,
    bagId: '5',
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "vokey-sm10", "ping-pld-anser"],
      handicap: 8,
      totalValue: 4500
    }
  },
  {
    postId: '11',
    userId: 'william-foster',
    userName: 'William Foster',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
    userHandicap: 14,
    postType: 'equipment_showcase',
    imageUrl: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=600&h=750&fit=crop',
    caption: 'Vintage meets modern technology. These Titleist clubs are pure class 🎯',
    likes: 145,
    commentCount: 22,
    timestamp: createTimestamp(60),
    isFromFollowed: true,
    bagId: '8',
    bagData: {
      featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "ping-pld-anser"],
      handicap: 14,
      totalValue: 3800
    }
  },
  {
    postId: '12',
    userId: 'chris-martinez',
    userName: 'Chris Martinez',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
    userHandicap: 16,
    postType: 'bag_photo',
    imageUrl: 'https://images.unsplash.com/photo-1592919505780-303950717480?w=600&h=750&fit=crop',
    caption: 'Distance hunter setup complete. Every yard counts when you\'re chasing par 🎯',
    likes: 112,
    commentCount: 14,
    timestamp: createTimestamp(72),
    isFromFollowed: false,
    bagId: '10',
    bagData: {
      featuredClubs: ["callaway-ai-smoke-max", "callaway-ai-smoke-fairway", "callaway-apex-hybrid", "callaway-apex-pro", "callaway-jaws-raw", "odyssey-white-hot"],
      handicap: 16,
      totalValue: 2900
    }
  },
  {
    postId: '13',
    userId: 'jessica-brown',
    userName: 'Jessica Brown',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b812c6d8?w=40&h=40&fit=crop',
    userHandicap: 20,
    postType: 'equipment_showcase',
    imageUrl: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=600&h=750&fit=crop',
    caption: 'All-weather warrior setup. Rain or shine, these clubs perform! ☔🌞',
    likes: 89,
    commentCount: 11,
    timestamp: createTimestamp(84),
    isFromFollowed: false,
    bagId: '12',
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
      handicap: 20,
      totalValue: 2600
    }
  },
  {
    postId: '14',
    userId: 'marcus-johnson',
    userName: 'Marcus Johnson',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
    userHandicap: 0,
    postType: 'new_equipment',
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=600&h=750&fit=crop',
    caption: 'Testing new Qi10 Max driver. Early results are promising - 15 yards extra carry! 🚀',
    likes: 456,
    commentCount: 38,
    timestamp: createTimestamp(96),
    isFromFollowed: true,
    bagId: '1',
    equipmentAdded: {
      name: 'Qi10 Max Driver',
      brand: 'TaylorMade',
      model: 'Qi10 Max'
    },
    bagData: {
      featuredClubs: ["tm-qi10-max", "tm-qi10-fairway", "tm-qi10-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 0,
      totalValue: 8500
    }
  },
  {
    postId: '15',
    userId: 'jennifer-park',
    userName: 'Jennifer Park',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
    userHandicap: 4,
    postType: 'tournament_prep',
    imageUrl: 'https://images.unsplash.com/photo-1654130277816-4b98d3ce5b59?w=600&h=750&fit=crop',
    caption: 'State amateur qualifier tomorrow. Feeling confident with this setup 💪⛳',
    likes: 334,
    commentCount: 45,
    timestamp: createTimestamp(120),
    isFromFollowed: true,
    bagId: '4',
    bagData: {
      featuredClubs: ["titleist-tsr3", "titleist-tsr3-fairway", "titleist-tsr2-hybrid", "titleist-t100", "vokey-sm10", "scotty-phantom-x5"],
      handicap: 4,
      totalValue: 6800
    }
  },
  {
    postId: '16',
    userId: 'james-wong',
    userName: 'James Wong',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
    userHandicap: 22,
    postType: 'bag_photo',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=750&fit=crop',
    caption: 'First full bag setup as a new golfer. Excited to break 90 this season! 🏌️‍♂️',
    likes: 43,
    commentCount: 18,
    timestamp: createTimestamp(168),
    isFromFollowed: false,
    bagId: 'new-2',  
    bagData: {
      featuredClubs: ["ping-g430-max", "ping-g430-fairway", "ping-g430-hybrid", "ping-i230", "cleveland-rtx6", "ping-pld-anser"],
      handicap: 22,
      totalValue: 1600
    }
  }
];

// Helper function to format timestamps
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return '1 week ago';
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
  
  return date.toLocaleDateString();
};

export const getPostTypeLabel = (type: FeedPostType): string => {
  const labels = {
    'bag_photo': 'Bag Photo',
    'new_equipment': 'New Equipment',
    'equipment_showcase': 'Equipment Showcase',
    'tournament_prep': 'Tournament Prep'
  };
  return labels[type];
};

// Feed algorithm helpers
export const getAlgorithmicFeed = (items: FeedItem[], isFollowingAnyone: boolean = true): FeedItem[] => {
  if (!isFollowingAnyone) {
    // Return mix of trending and discovery based on engagement
    return items.sort((a, b) => {
      const aQualityScore = a.caption.length > 50 ? 1 : 0;
      const bQualityScore = b.caption.length > 50 ? 1 : 0;
      const aScore = a.likes * 0.5 + a.timestamp.getTime() * 0.0000003 + aQualityScore * 0.2;
      const bScore = b.likes * 0.5 + b.timestamp.getTime() * 0.0000003 + bQualityScore * 0.2;
      return bScore - aScore;
    });
  }
  
  // Mix followed and discovery content
  const followed = items.filter(item => item.isFromFollowed).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const discovery = items.filter(item => !item.isFromFollowed).sort((a, b) => b.likes - a.likes);
  
  // Interleave: 2 followed, 1 discovery pattern
  const mixed: FeedItem[] = [];
  let f = 0, d = 0;
  
  while (f < followed.length || d < discovery.length) {
    // Add 2 followed posts
    if (f < followed.length) mixed.push(followed[f++]);
    if (f < followed.length) mixed.push(followed[f++]);
    
    // Add 1 discovery post
    if (d < discovery.length) mixed.push(discovery[d++]);
  }
  
  return mixed;
};

export const getViralPosts = (items: FeedItem[], threshold: number = 300): FeedItem[] => {
  return items.filter(item => item.likes >= threshold).sort((a, b) => b.likes - a.likes);
};

export const getHiddenGems = (items: FeedItem[], maxLikes: number = 50): FeedItem[] => {
  return items.filter(item => item.likes <= maxLikes && item.caption.length > 30).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};