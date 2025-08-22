import { supabase } from '@/lib/supabase';
import { userEquipmentLinkSchema } from '@/types/zodSchemas';
import type { 
  UserEquipmentLink, 
  UserEquipmentLinkWithStats,
  CreateUserEquipmentLinkData,
  LinkClick,
  AffiliateLinkMetadata
} from '@/types/affiliateVideos';

/**
 * Get all links for a specific bag
 */
export async function getBagEquipmentLinks(bagId: string): Promise<UserEquipmentLink[]> {
  try {
    const { data, error } = await supabase
      .from('user_equipment_links')
      .select('*')
      .eq('bag_id', bagId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bag equipment links:', error);
    return [];
  }
}

/**
 * Get links for a specific bag equipment item
 */
export async function listLinksForBagEquipment(bagEquipmentId: string) {
  return supabase
    .from('user_equipment_links')
    .select('*')
    .eq('bag_equipment_id', bagEquipmentId)
    .order('is_primary', { ascending: false })
    .order('sort_order');
}

/**
 * Get links for a specific bag equipment item (legacy compatibility)
 */
export async function getBagItemLinks(bagEquipmentId: string): Promise<UserEquipmentLink[]> {
  try {
    const { data, error } = await listLinksForBagEquipment(bagEquipmentId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bag item links:', error);
    return [];
  }
}

/**
 * Get user's links with click statistics
 */
export async function getUserLinksWithStats(userId: string): Promise<UserEquipmentLinkWithStats[]> {
  try {
    // Get all user's links
    const { data: links, error: linksError } = await supabase
      .from('user_equipment_links')
      .select(`
        *,
        bag_equipment!inner(
          equipment!inner(
            brand,
            model
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (linksError) throw linksError;

    if (!links || links.length === 0) return [];

    // Get click stats for each link
    const linkIds = links.map(link => link.id);
    const { data: clickStats, error: clickError } = await supabase
      .from('link_clicks')
      .select('link_id')
      .in('link_id', linkIds);

    if (clickError) {
      console.error('Error fetching click stats:', clickError);
    }

    // Count clicks per link
    const clickCounts: Record<string, number> = {};
    clickStats?.forEach(click => {
      clickCounts[click.link_id] = (clickCounts[click.link_id] || 0) + 1;
    });

    // Get last click time for each link
    const { data: lastClicks, error: lastClickError } = await supabase
      .from('link_clicks')
      .select('link_id, created_at')
      .in('link_id', linkIds)
      .order('created_at', { ascending: false });

    if (lastClickError) {
      console.error('Error fetching last clicks:', lastClickError);
    }

    const lastClickTimes: Record<string, string> = {};
    const seenLinks = new Set<string>();
    lastClicks?.forEach(click => {
      if (!seenLinks.has(click.link_id)) {
        lastClickTimes[click.link_id] = click.created_at;
        seenLinks.add(click.link_id);
      }
    });

    // Combine data
    return links.map(link => ({
      ...link,
      click_count: clickCounts[link.id] || 0,
      last_clicked: lastClickTimes[link.id] || null,
      revenue_generated: 0 // TODO: Calculate from actual affiliate revenue
    }));
  } catch (error) {
    console.error('Error fetching user links with stats:', error);
    return [];
  }
}

/**
 * Create or update an affiliate link with validation
 */
export async function upsertAffiliateLink(input: unknown) {
  const payload = userEquipmentLinkSchema.parse(input);
  
  // Check if this is the first link for this bag equipment
  const { count } = await supabase
    .from('user_equipment_links')
    .select('*', { count: 'exact', head: true })
    .eq('bag_equipment_id', payload.bag_equipment_id);
  
  // Auto-set as primary if this is the first link
  if (count === 0 || count === null) {
    payload.is_primary = true;
  }
  
  // If marking as primary, unmark others
  if (payload.is_primary) {
    await supabase
      .from('user_equipment_links')
      .update({ is_primary: false })
      .eq('bag_equipment_id', payload.bag_equipment_id);
  }
  
  return supabase
    .from('user_equipment_links')
    .insert(payload)
    .select()
    .single();
}

/**
 * Create a new equipment link (legacy compatibility)
 */
export async function createEquipmentLink(
  userId: string,
  bagId: string,
  data: CreateUserEquipmentLinkData
): Promise<UserEquipmentLink | null> {
  try {
    // Get equipment_id from bag_equipment
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select('equipment_id')
      .eq('id', data.bag_equipment_id)
      .single();

    if (bagError) throw bagError;

    const input = {
      user_id: userId,
      bag_id: bagId,
      bag_equipment_id: data.bag_equipment_id,
      equipment_id: bagEquipment.equipment_id,
      label: data.label,
      url: data.url,
      is_primary: data.is_primary || false,
      sort_order: 0
    };

    const { data: link, error } = await upsertAffiliateLink(input);
    if (error) throw error;
    return link;
  } catch (error) {
    console.error('Error creating equipment link:', error);
    return null;
  }
}

/**
 * Update an equipment link
 */
export async function updateEquipmentLink(
  linkId: string,
  userId: string,
  updates: Partial<UserEquipmentLink>
): Promise<boolean> {
  try {
    // If setting as primary, unset others first
    if (updates.is_primary) {
      const { data: currentLink } = await supabase
        .from('user_equipment_links')
        .select('bag_equipment_id')
        .eq('id', linkId)
        .single();

      if (currentLink) {
        await supabase
          .from('user_equipment_links')
          .update({ is_primary: false })
          .eq('bag_equipment_id', currentLink.bag_equipment_id)
          .neq('id', linkId);
      }
    }

    const { error } = await supabase
      .from('user_equipment_links')
      .update(updates)
      .eq('id', linkId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating equipment link:', error);
    return false;
  }
}

/**
 * Delete an affiliate link
 */
export async function deleteAffiliateLink(id: string) {
  return supabase
    .from('user_equipment_links')
    .delete()
    .eq('id', id);
}

/**
 * Delete an equipment link (legacy compatibility)
 */
export async function deleteEquipmentLink(
  linkId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_equipment_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting equipment link:', error);
    return false;
  }
}

/**
 * Track a link click
 */
export async function trackLinkClick(
  linkId: string,
  userId?: string,
  bagId?: string,
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  }
): Promise<void> {
  try {
    const clickData: Partial<LinkClick> = {
      link_id: linkId,
      clicked_by_user: userId,
      bag_id: bagId,
      utm_source: utm?.source,
      utm_medium: utm?.medium,
      utm_campaign: utm?.campaign,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined
    };

    // Hash IP for privacy (server-side would be better)
    if (typeof window !== 'undefined') {
      clickData.user_agent = navigator.userAgent;
    }

    const { error } = await supabase
      .from('link_clicks')
      .insert(clickData);

    if (error) {
      console.error('Error tracking link click:', error);
    }
  } catch (error) {
    console.error('Error in trackLinkClick:', error);
  }
}

/**
 * Get click analytics for a link
 */
export async function getLinkAnalytics(
  linkId: string,
  userId: string
): Promise<{
  total_clicks: number;
  unique_users: number;
  clicks_by_day: Array<{ date: string; count: number }>;
  top_referrers: Array<{ referrer: string; count: number }>;
}> {
  try {
    // Verify link ownership
    const { data: link, error: linkError } = await supabase
      .from('user_equipment_links')
      .select('user_id')
      .eq('id', linkId)
      .single();

    if (linkError || link.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Get all clicks
    const { data: clicks, error: clicksError } = await supabase
      .from('link_clicks')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: false });

    if (clicksError) throw clicksError;

    if (!clicks || clicks.length === 0) {
      return {
        total_clicks: 0,
        unique_users: 0,
        clicks_by_day: [],
        top_referrers: []
      };
    }

    // Calculate analytics
    const uniqueUsers = new Set(clicks.filter(c => c.clicked_by_user).map(c => c.clicked_by_user));
    
    // Group by day
    const clicksByDay: Record<string, number> = {};
    clicks.forEach(click => {
      const date = new Date(click.created_at).toISOString().split('T')[0];
      clicksByDay[date] = (clicksByDay[date] || 0) + 1;
    });

    // Group by referrer
    const referrerCounts: Record<string, number> = {};
    clicks.forEach(click => {
      if (click.referrer) {
        referrerCounts[click.referrer] = (referrerCounts[click.referrer] || 0) + 1;
      }
    });

    return {
      total_clicks: clicks.length,
      unique_users: uniqueUsers.size,
      clicks_by_day: Object.entries(clicksByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      top_referrers: Object.entries(referrerCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  } catch (error) {
    console.error('Error fetching link analytics:', error);
    return {
      total_clicks: 0,
      unique_users: 0,
      clicks_by_day: [],
      top_referrers: []
    };
  }
}

/**
 * Parse affiliate link metadata
 */
export function parseAffiliateLinkMetadata(url: string): AffiliateLinkMetadata {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Amazon
    if (hostname.includes('amazon.com') || hostname.includes('amzn.to')) {
      const tag = urlObj.searchParams.get('tag');
      return {
        retailer: 'Amazon',
        is_affiliate: !!tag,
        tracking_params: tag ? { tag } : undefined
      };
    }
    
    // eBay
    if (hostname.includes('ebay.com') || hostname.includes('ebay.to')) {
      const campid = urlObj.searchParams.get('campid');
      return {
        retailer: 'eBay',
        is_affiliate: !!campid,
        tracking_params: campid ? { campid } : undefined
      };
    }
    
    // Golf Galaxy / Dick's
    if (hostname.includes('golfgalaxy.com') || hostname.includes('dickssportinggoods.com')) {
      const affcode = urlObj.searchParams.get('affcode');
      return {
        retailer: hostname.includes('golfgalaxy') ? 'Golf Galaxy' : "Dick's Sporting Goods",
        is_affiliate: !!affcode,
        tracking_params: affcode ? { affcode } : undefined
      };
    }
    
    // TaylorMade
    if (hostname.includes('taylormadegolf.com')) {
      const utm_source = urlObj.searchParams.get('utm_source');
      return {
        retailer: 'TaylorMade',
        is_affiliate: utm_source === 'affiliate',
        tracking_params: utm_source ? { utm_source } : undefined
      };
    }
    
    // Generic check for common affiliate parameters
    const hasAffiliateParams = 
      urlObj.searchParams.has('ref') ||
      urlObj.searchParams.has('affiliate') ||
      urlObj.searchParams.has('partner') ||
      urlObj.searchParams.has('campaign');
    
    return {
      is_affiliate: hasAffiliateParams,
      tracking_params: hasAffiliateParams ? Object.fromEntries(urlObj.searchParams) : undefined
    };
  } catch {
    return { is_affiliate: false };
  }
}

/**
 * Validate and enhance affiliate URL
 */
export function validateAffiliateUrl(url: string): {
  valid: boolean;
  enhanced_url?: string;
  metadata?: AffiliateLinkMetadata;
  error?: string;
} {
  try {
    const urlObj = new URL(url);
    
    // Ensure HTTPS
    if (urlObj.protocol !== 'https:') {
      urlObj.protocol = 'https:';
    }
    
    const metadata = parseAffiliateLinkMetadata(urlObj.toString());
    
    return {
      valid: true,
      enhanced_url: urlObj.toString(),
      metadata
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}