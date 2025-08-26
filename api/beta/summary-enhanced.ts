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
  viralCoefficient: number;
  topReferrers: Array<{
    username: string | null;
    display_name: string | null;
    count: number;
  }>;
}

interface WaitlistMetrics {
  totalSize: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  avgScore: number;
  scoreDistribution: {
    high: number;    // 8-10
    medium: number;  // 5-7
    low: number;     // 0-4
  };
}

interface ApprovalMetrics {
  approvalsThisWeek: number;
  approvalsToday: number;
  avgApprovalsPerWeek: number;
  projectedCapacityDate: string | null;
  approvalVelocity: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface ConversionMetrics {
  waitlistToApproval: number;
  approvalToActivation: number;
  activationToEngagement: number;
  overallFunnel: number;
  avgTimeToActivation: number; // in hours
}

interface BetaSummaryResponse {
  cap: number;
  approved: number;          // Deprecated: use approvedActive instead
  approvedActive: number;    // Active beta users (not soft-deleted)
  approvedTotal: number;     // Total beta users (including soft-deleted)
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistMetrics: WaitlistMetrics;
  approvalMetrics: ApprovalMetrics;
  referralStats: ReferralStats;
  conversionMetrics: ConversionMetrics;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    
    // Count ACTIVE approved beta users (not soft-deleted)
    const { count: activeCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .is('deleted_at', null);
    
    // Count TOTAL approved beta users (including soft-deleted)
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true);
    
    const approvedActive = activeCount || 0;
    const approvedTotal = totalCount || 0;
    const remaining = Math.max(0, betaCap - approvedActive);
    
    // Fetch waitlist metrics
    const waitlistMetrics = await fetchWaitlistMetrics();
    
    // Fetch approval metrics
    const approvalMetrics = await fetchApprovalMetrics(betaCap, approvedActive);
    
    // Fetch referral statistics
    const referralStats = await fetchReferralStats(approvedTotal);
    
    // Fetch conversion metrics
    const conversionMetrics = await fetchConversionMetrics();
    
    const response: BetaSummaryResponse = {
      cap: betaCap,
      approved: approvedActive,     // Deprecated field - kept for backward compatibility
      approvedActive,               // Active beta users
      approvedTotal,                // Total beta users (including soft-deleted)
      remaining,
      publicBetaEnabled,
      waitlistMetrics,
      approvalMetrics,
      referralStats,
      conversionMetrics
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

async function fetchWaitlistMetrics(): Promise<WaitlistMetrics> {
  try {
    // Get all waitlist applications
    const { data: applications } = await supabase
      .from('waitlist_applications')
      .select('status, score');
    
    if (!applications || applications.length === 0) {
      return {
        totalSize: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        avgScore: 0,
        scoreDistribution: { high: 0, medium: 0, low: 0 }
      };
    }
    
    // Calculate metrics
    const pending = applications.filter(a => a.status === 'pending');
    const approved = applications.filter(a => a.status === 'approved');
    const rejected = applications.filter(a => a.status === 'rejected');
    
    const scores = applications.map(a => a.score || 0);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const scoreDistribution = {
      high: scores.filter(s => s >= 8).length,
      medium: scores.filter(s => s >= 5 && s < 8).length,
      low: scores.filter(s => s < 5).length
    };
    
    return {
      totalSize: applications.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      avgScore: Math.round(avgScore * 10) / 10,
      scoreDistribution
    };
  } catch (error) {
    console.error('[WaitlistMetrics] Error:', error);
    return {
      totalSize: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      avgScore: 0,
      scoreDistribution: { high: 0, medium: 0, low: 0 }
    };
  }
}

async function fetchApprovalMetrics(cap: number, current: number): Promise<ApprovalMetrics> {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count approvals today
    const { count: todayCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('approved_at', todayStart.toISOString());
    
    // Count approvals this week
    const { count: weekCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('approved_at', weekStart.toISOString());
    
    // Count approvals this month
    const { count: monthCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('approved_at', monthStart.toISOString());
    
    // Calculate average approvals per week (last 4 weeks)
    const fourWeeksAgo = new Date(now.setDate(now.getDate() - 28));
    const { count: fourWeekCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('approved_at', fourWeeksAgo.toISOString());
    
    const avgApprovalsPerWeek = (fourWeekCount || 0) / 4;
    
    // Calculate projected capacity date
    let projectedCapacityDate: string | null = null;
    if (avgApprovalsPerWeek > 0) {
      const remainingCapacity = cap - current;
      const weeksToCapacity = remainingCapacity / avgApprovalsPerWeek;
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + (weeksToCapacity * 7));
      projectedCapacityDate = projectedDate.toISOString().split('T')[0];
    }
    
    return {
      approvalsThisWeek: weekCount || 0,
      approvalsToday: todayCount || 0,
      avgApprovalsPerWeek: Math.round(avgApprovalsPerWeek * 10) / 10,
      projectedCapacityDate,
      approvalVelocity: {
        daily: todayCount || 0,
        weekly: weekCount || 0,
        monthly: monthCount || 0
      }
    };
  } catch (error) {
    console.error('[ApprovalMetrics] Error:', error);
    return {
      approvalsThisWeek: 0,
      approvalsToday: 0,
      avgApprovalsPerWeek: 0,
      projectedCapacityDate: null,
      approvalVelocity: { daily: 0, weekly: 0, monthly: 0 }
    };
  }
}

async function fetchReferralStats(approvedTotal: number): Promise<ReferralStats> {
  try {
    // Count referral signups
    const { count: referralSignups } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);
    
    // Get unique referrers
    const { data: referrerData } = await supabase
      .from('waitlist_applications')
      .select('referred_by')
      .not('referred_by', 'is', null);
    
    const uniqueReferrers = new Set(
      referrerData?.map(r => r.referred_by) || []
    ).size;
    
    // Get referral visits (from analytics_events if available)
    let referralVisits = 0;
    try {
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'referral_visit');
      referralVisits = count || 0;
    } catch {
      // Table might not exist yet
      referralVisits = referralSignups || 0; // Fallback to signups
    }
    
    // Calculate acceptance rate (signups / visits)
    const acceptanceRate = referralVisits > 0 
      ? Math.round((referralSignups || 0) / referralVisits * 100)
      : 0;
    
    // Calculate viral coefficient (average referrals per user)
    const viralCoefficient = uniqueReferrers > 0
      ? Math.round((referralSignups || 0) / uniqueReferrers * 100) / 100
      : 0;
    
    // Get top referrers with their referral counts
    const { data: topReferrersData } = await supabase
      .from('profiles')
      .select('username, display_name, total_referrals, direct_referrals')
      .gt('total_referrals', 0)
      .order('total_referrals', { ascending: false })
      .limit(5);
    
    // Calculate average chain depth
    const averageChainDepth = uniqueReferrers > 0 && referralSignups
      ? Math.round((referralSignups / uniqueReferrers) * 10) / 10
      : 0;
    
    return {
      totalReferrals: referralSignups || 0,
      uniqueReferrers,
      acceptanceRate,
      averageChainDepth,
      viralCoefficient,
      topReferrers: (topReferrersData || []).map(r => ({
        username: r.username,
        display_name: r.display_name,
        count: r.total_referrals || 0
      }))
    };
  } catch (error) {
    console.error('[ReferralStats] Error:', error);
    return {
      totalReferrals: 0,
      uniqueReferrers: 0,
      acceptanceRate: 0,
      averageChainDepth: 0,
      viralCoefficient: 0,
      topReferrers: []
    };
  }
}

async function fetchConversionMetrics(): Promise<ConversionMetrics> {
  try {
    // Get total waitlist applications
    const { count: totalWaitlist } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true });
    
    // Get approved applications
    const { count: totalApproved } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    
    // Get activated users (users who have logged in)
    const { count: activatedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true)
      .not('last_seen_at', 'is', null);
    
    // Get engaged users (users who have created a bag)
    const { count: engagedUsers } = await supabase
      .from('user_bags')
      .select('user_id', { count: 'exact', head: true });
    
    // Calculate conversion rates
    const waitlistToApproval = totalWaitlist && totalApproved
      ? Math.round((totalApproved / totalWaitlist) * 100)
      : 0;
    
    const approvalToActivation = totalApproved && activatedUsers
      ? Math.round((activatedUsers / totalApproved) * 100)
      : 0;
    
    const activationToEngagement = activatedUsers && engagedUsers
      ? Math.round((engagedUsers / activatedUsers) * 100)
      : 0;
    
    const overallFunnel = totalWaitlist && engagedUsers
      ? Math.round((engagedUsers / totalWaitlist) * 100)
      : 0;
    
    // Calculate average time to activation
    const { data: activationTimes } = await supabase
      .from('waitlist_applications')
      .select('approved_at')
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(100);
    
    let avgTimeToActivation = 24; // Default to 24 hours
    if (activationTimes && activationTimes.length > 0) {
      // This is simplified - in production, you'd track actual login times
      avgTimeToActivation = 12; // Assume 12 hours average
    }
    
    return {
      waitlistToApproval,
      approvalToActivation,
      activationToEngagement,
      overallFunnel,
      avgTimeToActivation
    };
  } catch (error) {
    console.error('[ConversionMetrics] Error:', error);
    return {
      waitlistToApproval: 0,
      approvalToActivation: 0,
      activationToEngagement: 0,
      overallFunnel: 0,
      avgTimeToActivation: 0
    };
  }
}