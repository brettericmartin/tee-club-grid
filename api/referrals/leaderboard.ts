import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  referral_count: number;
  trend?: 'up' | 'down' | 'same' | 'new';
  previous_rank?: number;
  is_current_user?: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  user_rank?: {
    rank: number;
    referral_count: number;
    trend?: 'up' | 'down' | 'same' | 'new';
  };
  period: string;
  last_updated: string;
  cache_ttl: number;
  privacy_mode: string;
}

// Privacy masking functions
function maskUsername(username: string | null, privacyMode: string): string | null {
  if (!username || privacyMode !== 'anonymous') return username;
  return null; // Will use "User #X" format in frontend
}

function maskDisplayName(name: string | null, privacyMode: string, rank: number): string | null {
  if (privacyMode === 'anonymous') {
    return `User #${rank}`;
  }
  if (privacyMode === 'username_first' || !name) {
    return null; // Prefer username
  }
  return name;
}

function shouldShowAvatar(privacyMode: string, showAvatars: boolean): boolean {
  return showAvatars && privacyMode !== 'anonymous';
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
    // Get user ID from auth header if present
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Fetch feature flags
    const { data: featureFlags, error: flagsError } = await supabase
      .from('feature_flags')
      .select(`
        leaderboard_enabled,
        leaderboard_cache_minutes,
        leaderboard_size,
        leaderboard_show_avatars,
        leaderboard_time_period,
        leaderboard_privacy_mode
      `)
      .eq('id', 1)
      .single();

    if (flagsError) {
      console.error('[Leaderboard] Error fetching feature flags:', flagsError);
      return res.status(500).json({ error: 'Unable to fetch leaderboard configuration' });
    }

    // Check if leaderboard is enabled
    if (!featureFlags?.leaderboard_enabled) {
      return res.status(403).json({ error: 'Leaderboard is currently disabled' });
    }

    // Get configuration with defaults
    const cacheMinutes = featureFlags.leaderboard_cache_minutes || 5;
    const leaderboardSize = featureFlags.leaderboard_size || 10;
    const showAvatars = featureFlags.leaderboard_show_avatars || false;
    const privacyMode = featureFlags.leaderboard_privacy_mode || 'username_first';
    
    // Get time period from query or use default
    const period = (req.query.period as string) || featureFlags.leaderboard_time_period || '30d';
    const includeTrends = req.query.trends === 'true';

    // Validate period
    if (!['7d', '30d', 'all'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use 7d, 30d, or all' });
    }

    // Get leaderboard data using the database function
    let leaderboardData;
    
    if (includeTrends) {
      const { data, error } = await supabase.rpc('get_referral_leaderboard_with_trends', {
        p_time_period: period,
        p_limit: leaderboardSize
      });

      if (error) {
        console.error('[Leaderboard] Error fetching leaderboard with trends:', error);
        return res.status(500).json({ error: 'Unable to fetch leaderboard' });
      }

      leaderboardData = data;
    } else {
      const { data, error } = await supabase.rpc('get_referral_leaderboard', {
        p_time_period: period,
        p_limit: leaderboardSize
      });

      if (error) {
        console.error('[Leaderboard] Error fetching leaderboard:', error);
        return res.status(500).json({ error: 'Unable to fetch leaderboard' });
      }

      leaderboardData = data;
    }

    // Process entries with privacy masking
    const entries: LeaderboardEntry[] = (leaderboardData || []).map((entry: any) => {
      const isCurrentUser = userId && entry.profile_id === userId;
      
      return {
        rank: entry.rank,
        profile_id: isCurrentUser ? entry.profile_id : undefined, // Only show ID for current user
        display_name: isCurrentUser ? entry.display_name : maskDisplayName(entry.display_name, privacyMode, entry.rank),
        username: isCurrentUser ? entry.username : maskUsername(entry.username, privacyMode),
        avatar_url: (isCurrentUser || shouldShowAvatar(privacyMode, showAvatars)) ? entry.avatar_url : null,
        referral_count: entry.referral_count,
        trend: entry.trend,
        previous_rank: entry.previous_rank,
        is_current_user: isCurrentUser
      };
    });

    // Get user's rank if they're authenticated but not in top N
    let userRank = undefined;
    if (userId) {
      const userEntry = entries.find(e => e.is_current_user);
      
      if (!userEntry) {
        // User is not in top N, get their actual rank
        const { data: userStats, error: userError } = await supabase
          .from('profiles')
          .select('referrals_count')
          .eq('id', userId)
          .single();

        if (!userError && userStats && userStats.referrals_count > 0) {
          // Count how many users have more referrals
          const { count: rankCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('referrals_count', userStats.referrals_count)
            .eq('show_referrer', true)
            .is('deleted_at', null);

          userRank = {
            rank: (rankCount || 0) + 1,
            referral_count: userStats.referrals_count,
            trend: undefined // No trend data for users outside top N
          };
        }
      } else {
        userRank = {
          rank: userEntry.rank,
          referral_count: userEntry.referral_count,
          trend: userEntry.trend
        };
      }
    }

    const response: LeaderboardResponse = {
      entries,
      user_rank: userRank,
      period,
      last_updated: new Date().toISOString(),
      cache_ttl: cacheMinutes * 60, // Convert to seconds
      privacy_mode: privacyMode
    };

    // Set cache headers
    const maxAge = cacheMinutes * 60; // Convert to seconds
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge / 2}`);
    res.setHeader('X-Cache-TTL', maxAge.toString());
    res.setHeader('X-Privacy-Mode', privacyMode);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('[Leaderboard] Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}