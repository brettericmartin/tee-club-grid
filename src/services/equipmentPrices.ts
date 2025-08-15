import { supabase } from '@/lib/supabase';
import type { 
  EquipmentPrice, 
  EquipmentPriceWithSavings, 
  PriceComparisonData 
} from '@/types/equipmentPrices';

/**
 * Fetch all prices for a specific equipment item
 */
export async function getEquipmentPrices(
  equipmentId: string
): Promise<EquipmentPriceWithSavings[]> {
  try {
    // Fetch automated prices
    const { data: automatedPrices, error: pricesError } = await supabase
      .from('equipment_prices')
      .select('*')
      .eq('equipment_id', equipmentId);

    if (pricesError) {
      console.error('Error fetching equipment prices:', pricesError);
    }

    // Fetch user-verified prices
    const { data: verifiedPrices, error: verifiedError } = await supabase
      .from('price_verifications')
      .select(`
        id,
        price,
        retailer_name,
        product_url,
        verified_at,
        profiles!inner(username, display_name)
      `)
      .eq('equipment_id', equipmentId);

    if (verifiedError) {
      console.error('Error fetching verified prices:', verifiedError);
    }

    // Combine and transform all prices
    const allPrices = [];

    // Add automated prices
    if (automatedPrices) {
      allPrices.push(...automatedPrices.map(price => ({
        ...price,
        currency: 'USD',
        condition: price.retailer.includes('Used') ? 'used' : 'new',
        sale_price: null,
        savings: 0,
        savings_percent: 0,
        last_checked: price.recorded_at || new Date().toISOString(),
        source: 'automated' as const
      })));
    }

    // Add user-verified prices
    if (verifiedPrices) {
      allPrices.push(...verifiedPrices.map(verification => ({
        id: verification.id,
        equipment_id: equipmentId,
        retailer: verification.retailer_name + ' (Verified)',
        price: verification.price,
        url: verification.product_url,
        affiliate_url: verification.product_url,
        in_stock: true, // Assume verified prices are in stock unless stated otherwise
        recorded_at: verification.verified_at,
        currency: 'USD',
        condition: verification.retailer_name.includes('Used') ? 'used' : 'new',
        sale_price: null,
        savings: 0,
        savings_percent: 0,
        last_checked: verification.verified_at,
        source: 'user_verified' as const,
        verified_by: verification.profiles?.username || verification.profiles?.display_name || 'User'
      })));
    }

    // Sort by price (ascending)
    allPrices.sort((a, b) => a.price - b.price);

    return allPrices;
  } catch (error) {
    console.error('Error in getEquipmentPrices:', error);
    return [];
  }
}

/**
 * Get the best (lowest) price for an equipment item
 */
export async function getBestEquipmentPrice(
  equipmentId: string
): Promise<EquipmentPrice | null> {
  try {
    const { data, error } = await supabase
      .from('equipment_prices')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching best price:', error);
      return null;
    }

    if (!data) return null;

    // Transform to match our interface
    return {
      ...data,
      currency: 'USD',
      condition: data.retailer.includes('Used') ? 'used' : 'new',
      sale_price: null,
      is_active: true,
      created_at: data.recorded_at || new Date().toISOString(),
      updated_at: data.recorded_at || new Date().toISOString()
    } as EquipmentPrice;
  } catch (error) {
    console.error('Error in getBestEquipmentPrice:', error);
    return null;
  }
}

/**
 * Get price comparison data with statistics
 */
export async function getPriceComparisonData(
  equipmentId: string
): Promise<PriceComparisonData | null> {
  try {
    const prices = await getEquipmentPrices(equipmentId);
    
    if (prices.length === 0) {
      return null;
    }

    // Calculate statistics
    const activePrices = prices
      .filter(p => p.in_stock)
      .map(p => p.sale_price || p.price);
    
    const averagePrice = activePrices.length > 0
      ? activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length
      : 0;

    const priceRange = {
      min: Math.min(...activePrices),
      max: Math.max(...activePrices)
    };

    const bestPrice = prices.find(p => p.in_stock) || null;

    return {
      equipmentId,
      prices,
      bestPrice,
      averagePrice,
      priceRange,
      lastUpdated: prices[0]?.last_checked || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getPriceComparisonData:', error);
    return null;
  }
}

/**
 * Track when a user clicks on a price link (for analytics)
 */
export async function trackPriceClick(
  priceId: string,
  userId?: string
): Promise<void> {
  try {
    // Log the click event (you could send this to an analytics service)
    const eventData = {
      event: 'price_click',
      price_id: priceId,
      user_id: userId,
      timestamp: new Date().toISOString()
    };

    // For now, just log it
    console.log('Price click tracked:', eventData);

    // In the future, you might want to:
    // - Send to Google Analytics
    // - Store in a clicks table
    // - Update click counters
  } catch (error) {
    console.error('Error tracking price click:', error);
  }
}

/**
 * Request a price update for stale data
 */
export async function requestPriceUpdate(
  equipmentId: string
): Promise<boolean> {
  try {
    // Check if prices are stale (older than 24 hours)
    const { data: prices, error } = await supabase
      .from('equipment_prices')
      .select('last_checked')
      .eq('equipment_id', equipmentId)
      .order('last_checked', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking price freshness:', error);
      return false;
    }

    const lastChecked = prices?.[0]?.last_checked;
    if (lastChecked) {
      const hoursSinceUpdate = 
        (Date.now() - new Date(lastChecked).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log('Prices are fresh, no update needed');
        return false;
      }
    }

    // Queue the equipment for price update
    // This would typically trigger a background job or webhook
    console.log(`Queuing price update for equipment ${equipmentId}`);
    
    // For now, we'll just mark it as needing update
    // In production, this would trigger the scraping agent
    return true;
  } catch (error) {
    console.error('Error requesting price update:', error);
    return false;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercent(
  originalPrice: number, 
  salePrice: number
): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Get retailer display name
 */
export function getRetailerDisplayName(retailer: string): string {
  const displayNames: Record<string, string> = {
    'pga-superstore': 'PGA Tour Superstore',
    'amazon': 'Amazon',
    '2nd-swing': '2nd Swing Golf',
    'taylormade': 'TaylorMade',
    'callaway': 'Callaway',
    'titleist': 'Titleist',
    'ping': 'Ping',
    'golf-galaxy': 'Golf Galaxy',
    'tgw': 'TGW'
  };

  return displayNames[retailer.toLowerCase()] || retailer;
}

/**
 * Get condition badge color
 */
export function getConditionBadgeVariant(condition: string): string {
  switch (condition) {
    case 'new':
      return 'default';
    case 'used-like-new':
    case 'refurbished':
      return 'secondary';
    case 'used-excellent':
      return 'outline';
    case 'used-good':
    case 'used-fair':
      return 'muted';
    default:
      return 'outline';
  }
}

/**
 * Format condition for display
 */
export function formatCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': 'New',
    'used-like-new': 'Like New',
    'used-excellent': 'Excellent',
    'used-good': 'Good',
    'used-fair': 'Fair',
    'refurbished': 'Refurbished'
  };

  return conditionMap[condition] || condition;
}