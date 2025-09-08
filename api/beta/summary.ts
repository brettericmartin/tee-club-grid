import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReferralStats {
  totalReferrals: number;
  uniqueReferrers: number;
  acceptanceRate: number;
  averageChainDepth: number;
  topReferrers: Array<{
    username: string | null;
    display_name: string | null;
    count: number;
  }>;
}

interface BetaSummaryResponse {
  cap: number;
  totalUsers: number;        // Total registered users
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
  referralStats?: ReferralStats;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch feature flags to get beta cap and status
    const { data: featureFlags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('beta_cap, public_beta_enabled')
      .eq('id', 1)
      .single();
    
    if (flagsError) {
      console.error('[BetaSummary] Error fetching feature flags:', flagsError);
      return res.status(500).json({ 
        error: 'Unable to fetch beta configuration' 
      });
    }
    
    const betaCap = featureFlags?.beta_cap || 150;
    const publicBetaEnabled = featureFlags?.public_beta_enabled || false;
    
    // Count total users (everyone who signed up)
    const { count: userCount, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .is('deleted_at', null);
    
    if (countError) {
      console.error('[BetaSummary] Error counting users:', countError);
      return res.status(500).json({ 
        error: 'Unable to count users' 
      });
    }
    
    const totalUsers = userCount || 0;
    const remaining = Math.max(0, betaCap - totalUsers);
    
    // Optionally count waitlist size
    const { count: waitlistCount } = await supabase
      .from('waitlist_applications')
      .select('id', { count: 'exact', head: false })
      .eq('status', 'pending');
    
    // Fetch referral statistics
    let referralStats: ReferralStats | undefined;
    try {
      // Get total referrals
      const { count: totalReferrals } = await supabase
        .from('referral_chains')
        .select('*', { count: 'exact', head: true });
      
      // Get unique referrers
      const { data: referrerData } = await supabase
        .from('referral_chains')
        .select('referrer_profile_id')
        .not('referrer_profile_id', 'is', null);
      
      const uniqueReferrers = new Set(
        referrerData?.map(r => r.referrer_profile_id) || []
      ).size;
      
      // Get top referrers
      const { data: topReferrersData } = await supabase
        .from('profiles')
        .select('username, display_name, referrals_count')
        .gt('referrals_count', 0)
        .order('referrals_count', { ascending: false })
        .limit(5);
      
      // Calculate acceptance rate
      const acceptanceRate = totalUsers > 0 && totalReferrals
        ? Math.round((totalReferrals / totalUsers) * 100)
        : 0;
      
      // Calculate average chain depth (simplified)
      const averageChainDepth = uniqueReferrers > 0 && totalReferrals
        ? Math.round((totalReferrals / uniqueReferrers) * 10) / 10
        : 0;
      
      referralStats = {
        totalReferrals: totalReferrals || 0,
        uniqueReferrers,
        acceptanceRate,
        averageChainDepth,
        topReferrers: (topReferrersData || []).map(r => ({
          username: r.username,
          display_name: r.display_name,
          count: r.referrals_count || 0
        }))
      };
    } catch (error) {
      console.error('[BetaSummary] Error fetching referral stats:', error);
      // Don't fail the whole request if referral stats fail
    }
    
    const response: BetaSummaryResponse = {
      cap: betaCap,
      totalUsers,                   // Total registered users
      remaining,
      publicBetaEnabled,
      waitlistCount: waitlistCount || 0,
      referralStats
    };
    
    // Set cache headers for 1 minute with revalidation
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=30');
    res.setHeader('X-Cache-TTL', '60');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[BetaSummary] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    });
  }
}