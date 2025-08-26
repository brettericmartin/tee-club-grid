/**
 * Service for managing referral attribution and tracking
 */

import { supabase } from '@/lib/supabase';

export interface ReferralChain {
  id: string;
  referrer_profile_id: string | null;
  referred_profile_id: string;
  referral_code: string | null;
  attribution_type: 'signup' | 'waitlist' | 'invite_code';
  created_at: string;
}

export interface ReferrerInfo {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  invitesRemaining: number;
  referralChainDepth: number;
}

/**
 * Track referral attribution for a user
 * Called after successful signup with a referral code
 */
export async function trackReferralAttribution(
  userId: string,
  referralCode: string
): Promise<{
  success: boolean;
  referrer?: ReferrerInfo;
  message: string;
}> {
  try {
    // Call the attribution API
    const response = await fetch('/api/referral/attribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referral_code: referralCode
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('[ReferralService] Attribution successful:', result);
      return {
        success: true,
        referrer: result.referrer,
        message: result.message
      };
    } else {
      console.error('[ReferralService] Attribution failed:', result);
      return {
        success: false,
        message: result.message || 'Failed to attribute referral'
      };
    }
  } catch (error) {
    console.error('[ReferralService] Error tracking attribution:', error);
    return {
      success: false,
      message: 'Network error while attributing referral'
    };
  }
}

/**
 * Get the referral chain for a user
 * Returns who referred them
 */
export async function getReferralChain(userId: string): Promise<{
  referrer?: ReferrerInfo;
  referredAt?: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('referral_chains')
      .select(`
        created_at,
        referrer:referrer_profile_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('referred_profile_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      referrer: data.referrer as ReferrerInfo,
      referredAt: data.created_at
    };
  } catch (error) {
    console.error('[ReferralService] Error fetching referral chain:', error);
    return null;
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    // Get user's profile for invite data
    const { data: profile } = await supabase
      .from('profiles')
      .select('invite_quota, invites_used, referrals_count')
      .eq('id', userId)
      .single();

    // Get users this person has referred
    const { data: referrals, count: referralCount } = await supabase
      .from('referral_chains')
      .select('*, referred:referred_profile_id(*)', { count: 'exact' })
      .eq('referrer_profile_id', userId);

    // Calculate stats
    const totalReferrals = referralCount || 0;
    const successfulReferrals = profile?.referrals_count || 0;
    const invitesRemaining = Math.max(
      0,
      (profile?.invite_quota || 3) - (profile?.invites_used || 0)
    );

    // Calculate chain depth (how many levels deep the referral tree goes)
    let chainDepth = 0;
    if (referrals && referrals.length > 0) {
      // For simplicity, we'll just count direct referrals as depth 1
      // A more complex implementation would recursively check each referred user's referrals
      chainDepth = 1;
    }

    return {
      totalReferrals,
      successfulReferrals,
      pendingReferrals: totalReferrals - successfulReferrals,
      invitesRemaining,
      referralChainDepth: chainDepth
    };
  } catch (error) {
    console.error('[ReferralService] Error fetching referral stats:', error);
    return {
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingReferrals: 0,
      invitesRemaining: 0,
      referralChainDepth: 0
    };
  }
}

/**
 * Get top referrers for leaderboard
 */
export async function getTopReferrers(limit: number = 10): Promise<Array<{
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  referral_count: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, referrals_count')
      .gt('referrals_count', 0)
      .order('referrals_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ReferralService] Error fetching top referrers:', error);
      return [];
    }

    return (data || []).map(profile => ({
      id: profile.id,
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      referral_count: profile.referrals_count || 0
    }));
  } catch (error) {
    console.error('[ReferralService] Error fetching top referrers:', error);
    return [];
  }
}

/**
 * Check if a referral code is valid
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  referrer?: ReferrerInfo;
}> {
  try {
    const cleanCode = code.trim().toUpperCase();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('referral_code', cleanCode)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    return {
      valid: true,
      referrer: {
        id: data.id,
        display_name: data.display_name,
        username: data.username,
        avatar_url: data.avatar_url
      }
    };
  } catch (error) {
    console.error('[ReferralService] Error validating referral code:', error);
    return { valid: false };
  }
}

/**
 * Get users referred by a specific user
 */
export async function getUsersReferred(userId: string): Promise<Array<{
  id: string;
  display_name: string | null;
  username: string | null;
  joined_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('referral_chains')
      .select(`
        created_at,
        referred:referred_profile_id (
          id,
          display_name,
          username
        )
      `)
      .eq('referrer_profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ReferralService] Error fetching referred users:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.referred.id,
      display_name: item.referred.display_name,
      username: item.referred.username,
      joined_at: item.created_at
    }));
  } catch (error) {
    console.error('[ReferralService] Error fetching referred users:', error);
    return [];
  }
}

/**
 * Get global referral statistics for admin dashboard
 */
export async function getGlobalReferralStats(): Promise<{
  totalReferrals: number;
  uniqueReferrers: number;
  averageReferralsPerUser: number;
  viralCoefficient: number;
  topReferrer: ReferrerInfo | null;
}> {
  try {
    // Get total referral chains
    const { count: totalReferrals } = await supabase
      .from('referral_chains')
      .select('*', { count: 'exact', head: true });

    // Get unique referrers
    const { data: referrers } = await supabase
      .from('referral_chains')
      .select('referrer_profile_id')
      .not('referrer_profile_id', 'is', null);

    const uniqueReferrers = new Set(referrers?.map(r => r.referrer_profile_id) || []).size;

    // Calculate average
    const averageReferralsPerUser = uniqueReferrers > 0 
      ? (totalReferrals || 0) / uniqueReferrers 
      : 0;

    // Get top referrer
    const { data: topReferrerData } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, referrals_count')
      .gt('referrals_count', 0)
      .order('referrals_count', { ascending: false })
      .limit(1)
      .single();

    // Calculate viral coefficient (simplified)
    // K = i * c where i = invites sent, c = conversion rate
    const viralCoefficient = averageReferralsPerUser * 0.4; // Assuming 40% conversion

    return {
      totalReferrals: totalReferrals || 0,
      uniqueReferrers,
      averageReferralsPerUser: Math.round(averageReferralsPerUser * 100) / 100,
      viralCoefficient: Math.round(viralCoefficient * 100) / 100,
      topReferrer: topReferrerData ? {
        id: topReferrerData.id,
        display_name: topReferrerData.display_name,
        username: topReferrerData.username,
        avatar_url: topReferrerData.avatar_url
      } : null
    };
  } catch (error) {
    console.error('[ReferralService] Error fetching global stats:', error);
    return {
      totalReferrals: 0,
      uniqueReferrers: 0,
      averageReferralsPerUser: 0,
      viralCoefficient: 0,
      topReferrer: null
    };
  }
}