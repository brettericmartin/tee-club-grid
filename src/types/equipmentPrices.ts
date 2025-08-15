export type ProductCondition = 
  | 'new' 
  | 'used-like-new' 
  | 'used-excellent' 
  | 'used-good' 
  | 'used-fair' 
  | 'refurbished';

export type RetailerName = 
  | 'PGA Tour Superstore'
  | 'Amazon'
  | '2nd Swing Golf'
  | 'TaylorMade'
  | 'Callaway'
  | 'Titleist'
  | 'Ping'
  | 'Golf Galaxy'
  | 'TGW'
  | 'Fairway Golf'
  | 'Edwin Watts Golf';

export interface EquipmentPrice {
  id: string;
  equipment_id: string;
  retailer: string;
  retailer_logo_url?: string;
  price: number;
  sale_price?: number;
  currency: string;
  url: string;
  affiliate_url?: string;
  in_stock: boolean;
  condition: ProductCondition;
  shipping_cost?: number;
  availability_text?: string;
  last_checked: string;
  is_active: boolean;
  scraped_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EquipmentPriceWithSavings extends EquipmentPrice {
  savings: number;
  savings_percent: number;
  source?: 'automated' | 'user_verified';
  verified_by?: string;
}

export interface RetailerConfig {
  name: RetailerName;
  baseUrl: string;
  logoUrl?: string;
  searchPattern?: string;
  directProductPages?: boolean;
  hasUsedOptions?: boolean;
  requiresJS?: boolean;
  priceSelectors?: {
    regular?: string;
    sale?: string;
    availability?: string;
    condition?: string;
  };
  affiliateProgram?: {
    enabled: boolean;
    programName?: string;
    baseAffiliateUrl?: string;
    parameterName?: string;
  };
}

export const RETAILER_CONFIGS: Record<string, RetailerConfig> = {
  'pga-superstore': {
    name: 'PGA Tour Superstore',
    baseUrl: 'https://www.pgatoursuperstore.com',
    logoUrl: '/images/retailers/pga-superstore.png',
    searchPattern: '/search?q={brand}+{model}',
    requiresJS: true,
    priceSelectors: {
      regular: '.price-regular',
      sale: '.price-sale',
      availability: '.availability-status'
    },
    affiliateProgram: {
      enabled: false
    }
  },
  'amazon': {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    logoUrl: '/images/retailers/amazon.png',
    searchPattern: '/s?k={brand}+{model}+golf',
    requiresJS: true,
    affiliateProgram: {
      enabled: true,
      programName: 'Amazon Associates',
      baseAffiliateUrl: 'https://www.amazon.com/dp/',
      parameterName: 'tag'
    }
  },
  '2nd-swing': {
    name: '2nd Swing Golf',
    baseUrl: 'https://www.2ndswing.com',
    logoUrl: '/images/retailers/2nd-swing.png',
    searchPattern: '/search/?q={brand}+{model}',
    hasUsedOptions: true,
    priceSelectors: {
      regular: '.product-price',
      condition: '.condition-badge'
    },
    affiliateProgram: {
      enabled: true,
      programName: 'ShareASale',
      baseAffiliateUrl: 'https://www.shareasale.com/r.cfm'
    }
  },
  'taylormade': {
    name: 'TaylorMade',
    baseUrl: 'https://www.taylormade.com',
    logoUrl: '/images/retailers/taylormade.png',
    directProductPages: true,
    affiliateProgram: {
      enabled: false
    }
  },
  'callaway': {
    name: 'Callaway',
    baseUrl: 'https://www.callawaygolf.com',
    logoUrl: '/images/retailers/callaway.png',
    directProductPages: true,
    affiliateProgram: {
      enabled: true,
      programName: 'Commission Junction'
    }
  },
  'titleist': {
    name: 'Titleist',
    baseUrl: 'https://www.titleist.com',
    logoUrl: '/images/retailers/titleist.png',
    directProductPages: true,
    affiliateProgram: {
      enabled: false
    }
  },
  'ping': {
    name: 'Ping',
    baseUrl: 'https://ping.com',
    logoUrl: '/images/retailers/ping.png',
    directProductPages: true,
    affiliateProgram: {
      enabled: false
    }
  },
  'golf-galaxy': {
    name: 'Golf Galaxy',
    baseUrl: 'https://www.golfgalaxy.com',
    logoUrl: '/images/retailers/golf-galaxy.png',
    searchPattern: '/search?searchTerm={brand}+{model}',
    requiresJS: true,
    affiliateProgram: {
      enabled: true,
      programName: 'Commission Junction'
    }
  },
  'tgw': {
    name: 'TGW',
    baseUrl: 'https://www.tgw.com',
    logoUrl: '/images/retailers/tgw.png',
    searchPattern: '/search?q={brand}+{model}',
    affiliateProgram: {
      enabled: true,
      programName: 'ShareASale'
    }
  }
};

export interface PriceScrapingResult {
  retailer: string;
  price?: number;
  salePrice?: number;
  inStock?: boolean;
  condition?: ProductCondition;
  url: string;
  availabilityText?: string;
  shippingCost?: number;
  scrapedData?: Record<string, any>;
  error?: string;
}

export interface PriceComparisonData {
  equipmentId: string;
  prices: EquipmentPriceWithSavings[];
  bestPrice?: EquipmentPriceWithSavings;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  lastUpdated: string;
}