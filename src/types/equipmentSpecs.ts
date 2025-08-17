/**
 * Equipment Specifications Type Definitions
 * Comprehensive type system for all equipment categories and their specs
 */

// Universal specs that apply to all equipment
export interface UniversalSpecs {
  brand: string;
  model: string;
  category: string;
  msrp?: number;
  release_year?: number;
  release_date?: string;
  description?: string;
  image_url?: string;
  tour_usage?: string[];
  key_features?: string[];
}

// Driver specific specs
export interface DriverSpecs {
  loft_options?: string[];
  shaft_flex?: string[];
  head_size?: string;
  material?: string;
  adjustability?: string;
  face_technology?: string;
  crown_material?: string;
  stock_shaft?: string;
  swing_weight?: string;
  lie_angle?: string;
  face_angle?: string;
  spin?: string;
  launch?: string;
  forgiveness?: string;
  sound?: string;
}

// Iron specific specs
export interface IronSpecs {
  set_composition?: string;
  shaft_options?: string[];
  material?: string;
  technology?: string;
  offset?: string;
  sole_width?: string;
  top_line?: string;
  finish?: string;
  handicap_range?: string;
  forgiveness?: string;
  feel?: string;
  workability?: string;
  launch?: string;
  spin?: string;
}

// Putter specific specs
export interface PutterSpecs {
  head_style?: string;
  length_options?: string[];
  material?: string;
  face_insert?: string;
  toe_hang?: string;
  balance?: string;
  grip?: string;
  neck_style?: string;
  alignment_aid?: string;
  weight?: string;
  lie_angle?: string;
  loft?: string;
  finish?: string;
}

// Wedge specific specs
export interface WedgeSpecs {
  loft?: string;
  bounce?: string;
  grind?: string;
  material?: string;
  finish?: string;
  grooves?: string;
  shaft_options?: string[];
  length?: string;
  lie_angle?: string;
  sole_width?: string;
  leading_edge?: string;
  swing_weight?: string;
}

// Fairway wood specific specs
export interface FairwaySpecs {
  loft_options?: string[];
  shaft_flex?: string[];
  head_size?: string;
  material?: string;
  adjustability?: string;
  face_technology?: string;
  stock_shaft?: string;
  lie_angle?: string;
  face_angle?: string;
  launch?: string;
  spin?: string;
  forgiveness?: string;
}

// Hybrid specific specs
export interface HybridSpecs {
  loft_options?: string[];
  shaft_flex?: string[];
  head_size?: string;
  material?: string;
  adjustability?: string;
  offset?: string;
  stock_shaft?: string;
  lie_angle?: string;
  launch?: string;
  spin?: string;
  forgiveness?: string;
}

// Golf ball specific specs
export interface BallSpecs {
  construction?: string;
  compression?: string;
  cover_material?: string;
  dimple_count?: string;
  feel?: string;
  spin?: string;
  launch?: string;
  trajectory?: string;
  distance?: string;
  control?: string;
  durability?: string;
  color_options?: string[];
  quantity?: string;
}

// Bag specific specs
export interface BagSpecs {
  type?: string;
  dividers?: string;
  pockets?: string;
  strap_type?: string;
  weight?: string;
  material?: string;
  color_options?: string[];
  rain_hood?: string;
  stand_type?: string;
  cart_friendly?: string;
}

// Glove specific specs
export interface GloveSpecs {
  material?: string;
  sizes?: string[];
  hand?: string;
  color_options?: string[];
  weather_type?: string;
  closure_type?: string;
  durability?: string;
  grip?: string;
  breathability?: string;
}

// Rangefinder specific specs
export interface RangefinderSpecs {
  type?: string;
  range?: string;
  magnification?: string;
  accuracy?: string;
  slope?: string;
  battery_life?: string;
  waterproof?: string;
  display_type?: string;
  size?: string;
  weight?: string;
  features?: string[];
}

// Combined equipment specs type
export type EquipmentSpecs = UniversalSpecs & (
  | DriverSpecs
  | IronSpecs
  | PutterSpecs
  | WedgeSpecs
  | FairwaySpecs
  | HybridSpecs
  | BallSpecs
  | BagSpecs
  | GloveSpecs
  | RangefinderSpecs
);

// Helper type to get category-specific specs
export type CategorySpecs<T extends string> = 
  T extends 'driver' ? DriverSpecs :
  T extends 'iron' ? IronSpecs :
  T extends 'putter' ? PutterSpecs :
  T extends 'wedge' ? WedgeSpecs :
  T extends 'fairway' ? FairwaySpecs :
  T extends 'hybrid' ? HybridSpecs :
  T extends 'ball' ? BallSpecs :
  T extends 'bag' ? BagSpecs :
  T extends 'glove' ? GloveSpecs :
  T extends 'rangefinder' ? RangefinderSpecs :
  Record<string, any>;

// Spec display configuration
export interface SpecDisplay {
  label: string;
  value: string | undefined;
  icon?: string;
  priority: number;
  category?: string;
}

// Helper to determine equipment category from string
export function getEquipmentCategory(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes('driver')) return 'driver';
  if (normalized.includes('iron')) return 'iron';
  if (normalized.includes('putter')) return 'putter';
  if (normalized.includes('wedge')) return 'wedge';
  if (normalized.includes('fairway') || normalized.includes('wood')) return 'fairway';
  if (normalized.includes('hybrid') || normalized.includes('rescue')) return 'hybrid';
  if (normalized.includes('ball')) return 'ball';
  if (normalized.includes('bag')) return 'bag';
  if (normalized.includes('glove')) return 'glove';
  if (normalized.includes('rangefinder') || normalized.includes('gps')) return 'rangefinder';
  return 'other';
}