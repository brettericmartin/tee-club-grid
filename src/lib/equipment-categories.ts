// Standardized equipment categories - single source of truth
export const EQUIPMENT_CATEGORIES = {
  driver: 'driver',
  fairway_wood: 'fairway_wood',
  hybrid: 'hybrid',
  iron: 'iron',
  wedge: 'wedge',
  putter: 'putter',
  ball: 'ball',
  bag: 'bag',
  glove: 'glove',
  rangefinder: 'rangefinder',
  gps: 'gps',
  tee: 'tee',
  towel: 'towel',
  ball_marker: 'ball_marker',
  divot_tool: 'divot_tool',
  accessories: 'accessories'
} as const;

export type EquipmentCategory = typeof EQUIPMENT_CATEGORIES[keyof typeof EQUIPMENT_CATEGORIES];

// Display names for UI
export const CATEGORY_DISPLAY_NAMES: Record<EquipmentCategory, string> = {
  driver: 'Drivers',
  fairway_wood: 'Fairway Woods',
  hybrid: 'Hybrids',
  iron: 'Irons',
  wedge: 'Wedges',
  putter: 'Putters',
  ball: 'Golf Balls',
  bag: 'Golf Bags',
  glove: 'Gloves',
  rangefinder: 'Rangefinders',
  gps: 'GPS Devices',
  tee: 'Tees',
  towel: 'Towels',
  ball_marker: 'Ball Markers',
  divot_tool: 'Divot Tools',
  accessories: 'Accessories'
};

// For filtering - includes both singular and plural for backwards compatibility
export const CATEGORY_ALIASES: Record<string, EquipmentCategory> = {
  // Singular
  driver: 'driver',
  fairway_wood: 'fairway_wood',
  hybrid: 'hybrid',
  iron: 'iron',
  wedge: 'wedge',
  putter: 'putter',
  ball: 'ball',
  bag: 'bag',
  glove: 'glove',
  rangefinder: 'rangefinder',
  gps: 'gps',
  tee: 'tee',
  towel: 'towel',
  ball_marker: 'ball_marker',
  divot_tool: 'divot_tool',
  accessories: 'accessories',
  
  // Plural (for backwards compatibility)
  drivers: 'driver',
  fairway_woods: 'fairway_wood',
  hybrids: 'hybrid',
  irons: 'iron',
  wedges: 'wedge',
  putters: 'putter',
  balls: 'ball',
  bags: 'bag',
  gloves: 'glove',
  rangefinders: 'rangefinder',
  tees: 'tee',
  towels: 'towel',
  ball_markers: 'ball_marker',
  divot_tools: 'divot_tool',
  
  // Common variations
  woods: 'fairway_wood',
  fw: 'fairway_wood',
  '3wood': 'fairway_wood',
  '5wood': 'fairway_wood',
  'fairway': 'fairway_wood',
  'driving_iron': 'iron',
  'utility_iron': 'iron',
  'sand_wedge': 'wedge',
  'lob_wedge': 'wedge',
  'gap_wedge': 'wedge',
  'pitching_wedge': 'wedge',
  'gps_devices': 'gps',
  'golf_ball': 'ball',
  'golf_balls': 'ball'
};

// Normalize category for database storage
export function normalizeCategory(category: string): EquipmentCategory {
  const normalized = category.toLowerCase().trim().replace(/\s+/g, '_');
  return CATEGORY_ALIASES[normalized] || 'accessories';
}