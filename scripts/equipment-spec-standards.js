/**
 * Equipment Specification Standards for Teed.club
 * 
 * This module defines the standardized specification structure for all equipment categories.
 * It serves as the source of truth for data validation, normalization, and collection.
 */

export const EQUIPMENT_SPEC_STANDARDS = {
  // CLUBS - Primary Equipment
  driver: {
    required: {
      loft_options: { type: 'array', example: ['9°', '10.5°', '12°'] },
      head_size: { type: 'string', example: '460cc', format: /^\d{3}cc$/ },
      face_material: { type: 'string', example: 'Titanium' }
    },
    optional: {
      shaft_flex: { type: 'array', example: ['Regular', 'Stiff', 'X-Stiff'] },
      shaft_options: { type: 'array', example: ['Ventus Blue', 'Tensei Black'] },
      adjustability: { type: 'string', example: 'Loft ±2°, Lie ±1°' },
      face_technology: { type: 'string', example: 'Twist Face' },
      crown_material: { type: 'string', example: 'Carbon Composite' },
      stock_shaft: { type: 'string', example: 'Fujikura Ventus TR' },
      stock_grip: { type: 'string', example: 'Golf Pride Tour Velvet' },
      swing_weight: { type: 'string', example: 'D3', format: /^[A-F]\d$/ },
      cg_location: { type: 'string', example: 'Low-Back' },
      moi: { type: 'string', example: '5300 g·cm²' },
      year: { type: 'number', example: 2024 }
    }
  },

  fairway_wood: {
    required: {
      loft_options: { type: 'array', example: ['15°', '18°', '21°'] },
      head_size: { type: 'string', example: '180cc' },
      face_material: { type: 'string', example: 'Stainless Steel' }
    },
    optional: {
      shaft_flex: { type: 'array', example: ['Regular', 'Stiff'] },
      shaft_options: { type: 'array', example: ['Project X HZRDUS', 'Aldila Rogue'] },
      adjustability: { type: 'string', example: 'Loft ±1.5°' },
      sole_design: { type: 'string', example: 'V-Steel' },
      stock_shaft: { type: 'string', example: 'UST Recoil' },
      stock_grip: { type: 'string', example: 'Lamkin Crossline' },
      swing_weight: { type: 'string', example: 'D2' },
      year: { type: 'number', example: 2024 }
    }
  },

  hybrid: {
    required: {
      loft_options: { type: 'array', example: ['19°', '22°', '25°'] },
      head_size: { type: 'string', example: '105cc' }
    },
    optional: {
      shaft_flex: { type: 'array', example: ['Regular', 'Stiff'] },
      shaft_options: { type: 'array', example: ['KBS Hybrid', 'UST Recoil'] },
      adjustability: { type: 'string', example: 'Loft ±1°' },
      sole_width: { type: 'string', example: 'Wide' },
      offset: { type: 'string', example: '2mm' },
      stock_shaft: { type: 'string', example: 'UST Recoil ESX' },
      stock_grip: { type: 'string', example: 'Golf Pride MCC' },
      year: { type: 'number', example: 2024 }
    }
  },

  iron: {
    required: {
      set_makeup: { type: 'string', example: '4-PW', standardName: 'set_composition' },
      construction: { type: 'string', example: 'Forged', enum: ['Forged', 'Cast', 'Hollow Body'] }
    },
    optional: {
      shaft_material: { type: 'string', example: 'Steel', enum: ['Steel', 'Graphite'] },
      shaft_options: { type: 'array', example: ['KBS Tour', 'Dynamic Gold', 'UST Recoil'] },
      offset: { type: 'string', example: 'Progressive' },
      sole_width: { type: 'string', example: 'Medium', enum: ['Thin', 'Medium', 'Wide'] },
      technology: { type: 'string', example: 'SpeedFoam' },
      tungsten_weighting: { type: 'boolean', example: true },
      groove_type: { type: 'string', example: 'V-Groove' },
      stock_shaft: { type: 'string', example: 'True Temper Dynamic Gold' },
      stock_grip: { type: 'string', example: 'Golf Pride Tour Velvet' },
      year: { type: 'number', example: 2024 }
    }
  },

  wedge: {
    required: {
      loft_options: { type: 'array', example: ['50°', '54°', '58°', '60°'] },
      bounce_options: { type: 'array', example: ['8°', '10°', '12°', '14°'] }
    },
    optional: {
      grind_options: { type: 'array', example: ['F', 'S', 'M', 'D'] },
      groove_type: { type: 'string', example: 'Milled' },
      finish_options: { type: 'array', example: ['Chrome', 'Raw', 'Black'] },
      shaft_options: { type: 'array', example: ['Dynamic Gold', 'KBS Hi-Rev'] },
      sole_width: { type: 'string', example: 'Medium' },
      leading_edge: { type: 'string', example: 'Rounded' },
      stock_shaft: { type: 'string', example: 'True Temper Dynamic Gold S200' },
      stock_grip: { type: 'string', example: 'Golf Pride Tour Velvet' },
      year: { type: 'number', example: 2024 }
    }
  },

  putter: {
    required: {
      head_style: { type: 'string', enum: ['Blade', 'Mallet', 'Mid-Mallet'] },
      length_options: { type: 'array', example: ['33"', '34"', '35"'] },
      head_material: { type: 'string', example: '303 Stainless Steel' }
    },
    optional: {
      face_insert: { type: 'string', example: 'White Hot' },
      face_technology: { type: 'string', example: 'Grooved' },
      toe_hang: { type: 'string', example: 'Face Balanced', enum: ['Face Balanced', 'Slight Arc', 'Strong Arc'] },
      hosel_style: { type: 'string', example: 'Plumber\'s Neck' },
      alignment_aid: { type: 'string', example: '2-Ball' },
      grip_style: { type: 'string', example: 'Pistol' },
      head_weight: { type: 'string', example: '350g' },
      adjustable_weights: { type: 'boolean', example: true },
      stock_grip: { type: 'string', example: 'SuperStroke Pistol GT' },
      year: { type: 'number', example: 2024 }
    }
  },

  // COMPONENTS
  shaft: {
    required: {
      flex: { type: 'string', enum: ['Ladies', 'Senior', 'Regular', 'Stiff', 'X-Stiff', 'TX'] },
      weight: { type: 'string', example: '65g' },
      material: { type: 'string', enum: ['Graphite', 'Steel'] }
    },
    optional: {
      profile: { type: 'string', example: 'Low-Mid', enum: ['Low', 'Low-Mid', 'Mid', 'Mid-High', 'High'] },
      torque: { type: 'string', example: '3.5°' },
      kick_point: { type: 'string', example: 'Mid', enum: ['Low', 'Mid', 'High'] },
      launch: { type: 'string', example: 'Mid', enum: ['Low', 'Mid', 'High'] },
      spin: { type: 'string', example: 'Low', enum: ['Low', 'Mid', 'High'] },
      butt_diameter: { type: 'string', example: '0.600"' },
      tip_diameter: { type: 'string', example: '0.335"' },
      length: { type: 'string', example: '46"' },
      year: { type: 'number', example: 2024 }
    }
  },

  grip: {
    required: {
      size: { type: 'string', enum: ['Undersize', 'Standard', 'Midsize', 'Jumbo'] },
      material: { type: 'string', example: 'Rubber' }
    },
    optional: {
      weight: { type: 'string', example: '50g' },
      core_size: { type: 'string', example: '0.600"', enum: ['0.560"', '0.580"', '0.600"'] },
      texture: { type: 'string', example: 'Cord' },
      firmness: { type: 'string', example: 'Medium', enum: ['Soft', 'Medium', 'Firm'] },
      weather_resistance: { type: 'string', example: 'All-Weather' },
      taper: { type: 'string', example: 'Non-Tapered' },
      year: { type: 'number', example: 2024 }
    }
  },

  ball: {
    required: {
      compression: { type: 'string', example: '90' },
      layers: { type: 'number', example: 3, enum: [2, 3, 4, 5] },
      cover_material: { type: 'string', example: 'Urethane', enum: ['Surlyn', 'Urethane', 'Ionomer'] }
    },
    optional: {
      dimple_count: { type: 'number', example: 332 },
      spin_rating: { type: 'string', example: 'Mid', enum: ['Low', 'Mid', 'High'] },
      feel: { type: 'string', example: 'Soft', enum: ['Soft', 'Medium', 'Firm'] },
      trajectory: { type: 'string', example: 'Mid', enum: ['Low', 'Mid', 'High'] },
      color_options: { type: 'array', example: ['White', 'Yellow', 'Orange'] },
      alignment_aid: { type: 'string', example: 'Triple Track' },
      year: { type: 'number', example: 2024 }
    }
  },

  // ACCESSORIES & GEAR
  bag: {
    required: {
      type: { type: 'string', enum: ['Stand', 'Cart', 'Tour', 'Carry', 'Sunday'] },
      dividers: { type: 'string', example: '14-Way' }
    },
    optional: {
      weight: { type: 'string', example: '5.5 lbs' },
      pockets: { type: 'number', example: 9 },
      strap_type: { type: 'string', example: 'Double' },
      material: { type: 'string', example: 'Nylon' },
      waterproof: { type: 'boolean', example: true },
      color_options: { type: 'array', example: ['Black', 'Navy', 'Red'] },
      cooler_pocket: { type: 'boolean', example: true },
      rangefinder_pocket: { type: 'boolean', example: true },
      year: { type: 'number', example: 2024 }
    }
  },

  glove: {
    required: {
      hand: { type: 'string', enum: ['Left', 'Right', 'Pair'] },
      material: { type: 'string', example: 'Cabretta Leather' }
    },
    optional: {
      size: { type: 'string', example: 'ML', enum: ['S', 'M', 'ML', 'L', 'XL', 'XXL'] },
      weather_type: { type: 'string', example: 'All-Weather' },
      closure: { type: 'string', example: 'Velcro' },
      color_options: { type: 'array', example: ['White', 'Black'] },
      year: { type: 'number', example: 2024 }
    }
  },

  rangefinder: {
    required: {
      max_range: { type: 'string', example: '1000 yards' },
      magnification: { type: 'string', example: '6x' }
    },
    optional: {
      slope: { type: 'boolean', example: true },
      accuracy: { type: 'string', example: '±1 yard' },
      display_type: { type: 'string', example: 'LCD' },
      waterproof: { type: 'boolean', example: true },
      battery_type: { type: 'string', example: 'CR2' },
      vibration: { type: 'boolean', example: true },
      size: { type: 'string', example: '4.1" x 2.8" x 1.5"' },
      weight: { type: 'string', example: '6.6 oz' },
      year: { type: 'number', example: 2024 }
    }
  },

  gps: {
    required: {
      type: { type: 'string', enum: ['Watch', 'Handheld', 'Cart-mounted'] },
      courses_loaded: { type: 'string', example: '40,000+' }
    },
    optional: {
      battery_life: { type: 'string', example: '15 hours' },
      display_type: { type: 'string', example: 'Color LCD' },
      waterproof: { type: 'string', example: 'IPX7' },
      shot_tracking: { type: 'boolean', example: true },
      scorecard: { type: 'boolean', example: true },
      hazard_info: { type: 'boolean', example: true },
      green_view: { type: 'boolean', example: true },
      smartphone_sync: { type: 'boolean', example: true },
      year: { type: 'number', example: 2024 }
    }
  },

  // SMALL ACCESSORIES
  tee: {
    required: {
      material: { type: 'string', example: 'Wood', enum: ['Wood', 'Plastic', 'Bamboo', 'Composite'] },
      length: { type: 'string', example: '2.75"' }
    },
    optional: {
      pack_size: { type: 'number', example: 100 },
      color_options: { type: 'array', example: ['Natural', 'White', 'Mixed'] },
      performance_feature: { type: 'string', example: 'Low Friction' }
    }
  },

  towel: {
    required: {
      material: { type: 'string', example: 'Microfiber' },
      size: { type: 'string', example: '16" x 24"' }
    },
    optional: {
      attachment: { type: 'string', example: 'Carabiner' },
      color_options: { type: 'array', example: ['Black', 'White', 'Navy'] },
      features: { type: 'array', example: ['Waffle texture', 'Club groove cleaner'] }
    }
  },

  ball_marker: {
    required: {
      material: { type: 'string', example: 'Metal' },
      size: { type: 'string', example: '1"' }
    },
    optional: {
      design: { type: 'string', example: 'Magnetic' },
      attachment: { type: 'string', example: 'Hat Clip' },
      customizable: { type: 'boolean', example: true }
    }
  },

  divot_tool: {
    required: {
      material: { type: 'string', example: 'Aluminum' },
      style: { type: 'string', example: 'Switchblade', enum: ['Traditional', 'Switchblade', 'Single Prong'] }
    },
    optional: {
      length: { type: 'string', example: '3"' },
      ball_marker: { type: 'boolean', example: true },
      features: { type: 'array', example: ['Groove cleaner', 'Magnetic'] }
    }
  },

  accessories: {
    required: {
      type: { type: 'string', example: 'Training Aid' },
      primary_use: { type: 'string', example: 'Swing improvement' }
    },
    optional: {
      material: { type: 'string', example: 'Various' },
      size: { type: 'string', example: 'Varies' },
      features: { type: 'array', example: ['Portable', 'Indoor use'] }
    }
  }
};

// Naming Convention Standards
export const NAMING_CONVENTIONS = {
  brands: {
    // Correct brand name formatting (key = common variation, value = correct format)
    'taylormade': 'TaylorMade',
    'taylor made': 'TaylorMade',
    'callaway': 'Callaway',
    'titleist': 'Titleist',
    'ping': 'Ping',
    'cobra': 'Cobra',
    'mizuno': 'Mizuno',
    'srixon': 'Srixon',
    'cleveland': 'Cleveland',
    'wilson': 'Wilson',
    'odyssey': 'Odyssey',
    'scotty cameron': 'Scotty Cameron',
    'scottycameron': 'Scotty Cameron',
    'taylormade golf': 'TaylorMade',
    'vokey': 'Vokey',
    'vokey design': 'Vokey',
    'footjoy': 'FootJoy',
    'foot joy': 'FootJoy',
    'golf pride': 'Golf Pride',
    'golfpride': 'Golf Pride',
    'lamkin': 'Lamkin',
    'superstroke': 'SuperStroke',
    'super stroke': 'SuperStroke',
    'bushnell': 'Bushnell',
    'garmin': 'Garmin',
    'skycaddie': 'SkyCaddie',
    'sky caddie': 'SkyCaddie'
  },

  flexRatings: {
    // Standardized flex ratings
    'l': 'Ladies',
    'ladies': 'Ladies',
    'a': 'Senior',
    'senior': 'Senior',
    'r': 'Regular',
    'regular': 'Regular',
    'reg': 'Regular',
    's': 'Stiff',
    'stiff': 'Stiff',
    'x': 'X-Stiff',
    'x-stiff': 'X-Stiff',
    'xstiff': 'X-Stiff',
    'xs': 'X-Stiff',
    'tx': 'TX',
    'tour x': 'TX'
  },

  measurements: {
    // Standardized measurement formats
    loft: (value) => `${value}°`,
    weight: (value, unit = 'g') => `${value}${unit}`,
    length: (value, unit = '"') => `${value}${unit}`,
    volume: (value) => `${value}cc`,
    torque: (value) => `${value}°`
  }
};

// Data Validation Rules
export const VALIDATION_RULES = {
  // Universal validation
  brand: {
    required: true,
    maxLength: 50,
    transform: (value) => {
      const lower = value.toLowerCase().trim();
      return NAMING_CONVENTIONS.brands[lower] || value;
    }
  },
  
  model: {
    required: true,
    maxLength: 100,
    validate: (value, brand) => {
      // Model should not include brand name
      if (brand && value.toLowerCase().includes(brand.toLowerCase())) {
        return `Model should not include brand name: "${value}" contains "${brand}"`;
      }
      return true;
    }
  },

  msrp: {
    type: 'number',
    min: 0,
    max: 10000,
    validate: (value) => {
      if (value && value < 1) {
        return 'MSRP seems too low';
      }
      if (value > 5000) {
        return 'MSRP seems unusually high - please verify';
      }
      return true;
    }
  },

  release_year: {
    type: 'number',
    min: 2000,
    max: new Date().getFullYear() + 1,
    validate: (value) => {
      const currentYear = new Date().getFullYear();
      if (value > currentYear) {
        return `Release year cannot be in the future (${value} > ${currentYear})`;
      }
      if (value < 2000) {
        return 'Equipment older than 2000 may not be relevant for most users';
      }
      return true;
    }
  },

  image_url: {
    type: 'string',
    validate: (value) => {
      if (!value) return 'Image URL is recommended for better user experience';
      if (!value.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|svg)$/i)) {
        return 'Image URL should be a valid image format (jpg, png, webp, svg)';
      }
      return true;
    }
  }
};

// Export helper functions
export function validateEquipmentSpecs(category, specs) {
  const standard = EQUIPMENT_SPEC_STANDARDS[category];
  if (!standard) {
    return { valid: false, errors: [`Unknown category: ${category}`] };
  }

  const errors = [];
  const warnings = [];

  // Check required fields
  for (const [field, config] of Object.entries(standard.required)) {
    if (!specs[field] && !specs[config.standardName]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types and formats
  const allFields = { ...standard.required, ...standard.optional };
  for (const [field, value] of Object.entries(specs)) {
    const config = allFields[field];
    if (!config) {
      warnings.push(`Unknown field for ${category}: ${field}`);
      continue;
    }

    // Type validation
    if (config.type && typeof value !== config.type) {
      if (config.type === 'array' && !Array.isArray(value)) {
        errors.push(`${field} should be an array, got ${typeof value}`);
      } else if (config.type !== 'array' && typeof value !== config.type) {
        errors.push(`${field} should be ${config.type}, got ${typeof value}`);
      }
    }

    // Enum validation
    if (config.enum && !config.enum.includes(value)) {
      errors.push(`${field} must be one of: ${config.enum.join(', ')}`);
    }

    // Format validation
    if (config.format && typeof value === 'string' && !value.match(config.format)) {
      errors.push(`${field} format invalid: expected format like "${config.example}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function normalizeSpecs(category, specs) {
  const normalized = { ...specs };
  const standard = EQUIPMENT_SPEC_STANDARDS[category];
  
  if (!standard) return normalized;

  // Apply naming convention fixes
  if (normalized.set_makeup && !normalized.set_composition) {
    normalized.set_composition = normalized.set_makeup;
    delete normalized.set_makeup;
  }

  // Normalize flex values
  if (normalized.flex) {
    const lower = normalized.flex.toLowerCase();
    normalized.flex = NAMING_CONVENTIONS.flexRatings[lower] || normalized.flex;
  }

  if (normalized.shaft_flex && Array.isArray(normalized.shaft_flex)) {
    normalized.shaft_flex = normalized.shaft_flex.map(flex => {
      const lower = flex.toLowerCase();
      return NAMING_CONVENTIONS.flexRatings[lower] || flex;
    });
  }

  // Normalize measurements
  if (normalized.loft_options && Array.isArray(normalized.loft_options)) {
    normalized.loft_options = normalized.loft_options.map(loft => {
      const num = parseFloat(loft);
      return isNaN(num) ? loft : NAMING_CONVENTIONS.measurements.loft(num);
    });
  }

  return normalized;
}