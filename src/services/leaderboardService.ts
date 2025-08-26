/**
 * Service for fetching and managing referral leaderboard data
 */

import { supabase } from '@/lib/supabase';
import type { PrivacyMode } from '@/utils/privacyMasking';

export interface LeaderboardEntry {
  rank: number;
  profile_id?: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  referral_count: number;
  trend?: 'up' | 'down' | 'same' | 'new';
  previous_rank?: number;
  is_current_user?: boolean;
}

export interface UserRank {
  rank: number;
  referral_count: number;
  trend?: 'up' | 'down' | 'same' | 'new';
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  user_rank?: UserRank;
  period: '7d' | '30d' | 'all';
  last_updated: string;
  cache_ttl: number;
  privacy_mode: PrivacyMode;
}

export type TimePeriod = '7d' | '30d' | 'all';

/**
 * Fetch the referral leaderboard
 */
export async function fetchLeaderboard(
  period: TimePeriod = '30d',
  includeTrends: boolean = false
): Promise<LeaderboardData | null> {
  try {
    // Get the current user's session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const queryParams = new URLSearchParams({
      period,
      ...(includeTrends && { trends: 'true' })
    });

    const response = await fetch(`/api/referrals/leaderboard?${queryParams}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.log('[LeaderboardService] Leaderboard is disabled');
        return null;
      }
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    const data: LeaderboardData = await response.json();
    return data;
  } catch (error) {
    console.error('[LeaderboardService] Error fetching leaderboard:', error);
    return null;
  }
}

/**
 * Get cached leaderboard data from localStorage
 */
export function getCachedLeaderboard(period: TimePeriod): LeaderboardData | null {
  try {
    const cacheKey = `leaderboard_${period}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const cacheExpiry = new Date(data.cache_expires);
    
    if (cacheExpiry < new Date()) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[LeaderboardService] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache leaderboard data in localStorage
 */
export function cacheLeaderboard(data: LeaderboardData): void {
  try {
    const cacheKey = `leaderboard_${data.period}`;
    const cacheExpires = new Date();
    cacheExpires.setSeconds(cacheExpires.getSeconds() + data.cache_ttl);
    
    const cacheData = {
      ...data,
      cache_expires: cacheExpires.toISOString()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[LeaderboardService] Error caching data:', error);
  }
}

/**
 * Clear all cached leaderboard data
 */
export function clearLeaderboardCache(): void {
  try {
    const periods: TimePeriod[] = ['7d', '30d', 'all'];
    periods.forEach(period => {
      localStorage.removeItem(`leaderboard_${period}`);
    });
  } catch (error) {
    console.error('[LeaderboardService] Error clearing cache:', error);
  }
}

/**
 * Subscribe to real-time leaderboard updates
 */
export function subscribeToLeaderboardUpdates(
  onUpdate: () => void
): () => void {
  // Subscribe to referral_chains inserts
  const subscription = supabase
    .channel('leaderboard_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'referral_chains'
      },
      () => {
        // Clear cache and trigger update
        clearLeaderboardCache();
        onUpdate();
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Get user's current referral count
 */
export async function getUserReferralCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referrals_count')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.referrals_count || 0;
  } catch (error) {
    console.error('[LeaderboardService] Error fetching user referral count:', error);
    return 0;
  }
}

/**
 * Check if leaderboard feature is enabled
 */
export async function isLeaderboardEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('leaderboard_enabled')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return false;
    }

    return data.leaderboard_enabled || false;
  } catch (error) {
    console.error('[LeaderboardService] Error checking leaderboard status:', error);
    return false;
  }
}

/**
 * Format leaderboard data for display
 */
export function formatLeaderboardEntry(
  entry: LeaderboardEntry,
  index: number
): {
  displayRank: string;
  displayName: string;
  medalEmoji?: string;
} {
  const medals = ['🥇', '🥈', '🥉'];
  const medalEmoji = index < 3 ? medals[index] : undefined;
  
  const displayName = entry.display_name || 
    (entry.username ? `@${entry.username}` : `User #${entry.rank}`);
  
  return {
    displayRank: `#${entry.rank}`,
    displayName,
    medalEmoji
  };
}