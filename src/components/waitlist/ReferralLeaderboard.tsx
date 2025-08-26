import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Sparkles, Users } from 'lucide-react';
import { 
  fetchLeaderboard, 
  getCachedLeaderboard, 
  cacheLeaderboard,
  subscribeToLeaderboardUpdates,
  type LeaderboardData,
  type TimePeriod 
} from '@/services/leaderboardService';
import { 
  formatDisplayName, 
  formatReferralCount,
  formatTimePeriod,
  getTrendIndicator,
  getTrendColorClass,
  getInitials,
  formatRank
} from '@/utils/privacyMasking';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralLeaderboardProps {
  variant?: 'full' | 'compact' | 'minimal';
  maxEntries?: number;
  showPeriodSelector?: boolean;
  showTrends?: boolean;
  className?: string;
}

export const ReferralLeaderboard: React.FC<ReferralLeaderboardProps> = ({
  variant = 'full',
  maxEntries = 10,
  showPeriodSelector = true,
  showTrends = true,
  className = ''
}) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load leaderboard data
  const loadLeaderboard = async (selectedPeriod: TimePeriod = period) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = getCachedLeaderboard(selectedPeriod);
      if (cached) {
        setLeaderboard(cached);
        setLoading(false);
        
        // Still fetch fresh data in background
        const fresh = await fetchLeaderboard(selectedPeriod, showTrends);
        if (fresh) {
          setLeaderboard(fresh);
          cacheLeaderboard(fresh);
        }
      } else {
        // No cache, fetch fresh
        const data = await fetchLeaderboard(selectedPeriod, showTrends);
        if (data) {
          setLeaderboard(data);
          cacheLeaderboard(data);
        } else {
          setError('Leaderboard is currently unavailable');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboardUpdates(() => {
      loadLeaderboard();
    });

    return () => {
      unsubscribe();
    };
  }, [period]);

  // Handle period change
  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
  };

  // Get medal emoji for top 3
  const getMedalEmoji = (rank: number): string | null => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  if (loading) {
    return <LeaderboardSkeleton compact={variant === 'compact'} rows={variant === 'minimal' ? 3 : 5} />;
  }

  if (error || !leaderboard) {
    return (
      <div className={`p-4 bg-gray-900/50 rounded-lg text-center ${className}`}>
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-600" />
        <p className="text-gray-500 text-sm">{error || 'No leaderboard data available'}</p>
      </div>
    );
  }

  const displayEntries = leaderboard.entries.slice(0, variant === 'minimal' ? 3 : maxEntries);

  return (
    <div className={`${className}`}>
      {/* Header */}
      {variant === 'full' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Referral Champions</h3>
          </div>

          {/* Period selector */}
          {showPeriodSelector && (
            <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
              {(['7d', '30d', 'all'] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    period === p
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {formatTimePeriod(p)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard entries */}
      <div className="space-y-2">
        {displayEntries.map((entry, index) => {
          const medal = getMedalEmoji(entry.rank);
          const displayName = formatDisplayName(
            entry.display_name,
            entry.username,
            leaderboard.privacy_mode,
            `User #${entry.rank}`
          );
          const initials = getInitials(
            entry.display_name,
            entry.username,
            leaderboard.privacy_mode
          );

          return (
            <div
              key={`${entry.rank}-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                entry.is_current_user
                  ? 'bg-green-900/20 border border-green-600/30'
                  : 'bg-gray-900/50 hover:bg-gray-900/70'
              } ${variant === 'compact' ? 'py-2' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank with medal */}
                <div className="flex items-center gap-1 min-w-[3rem]">
                  {medal && <span className="text-lg">{medal}</span>}
                  <span className={`font-semibold ${
                    entry.is_current_user ? 'text-green-500' : 'text-gray-400'
                  }`}>
                    #{entry.rank}
                  </span>
                </div>

                {/* Avatar (full variant only) */}
                {variant === 'full' && (
                  <div className="relative">
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-400">
                          {initials}
                        </span>
                      </div>
                    )}
                    {entry.is_current_user && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-[10px]">✓</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Name */}
                <div className="flex flex-col">
                  <span className={`font-medium ${
                    entry.is_current_user ? 'text-green-500' : 'text-white'
                  }`}>
                    {entry.is_current_user ? 'You' : displayName}
                  </span>
                  {variant === 'full' && entry.trend && showTrends && (
                    <span className={`text-xs ${getTrendColorClass(entry.trend)}`}>
                      {getTrendIndicator(entry.trend, true, entry.previous_rank, entry.rank)}
                    </span>
                  )}
                </div>
              </div>

              {/* Referral count and trend */}
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${
                  entry.is_current_user ? 'text-green-500' : 'text-gray-300'
                }`}>
                  {formatReferralCount(entry.referral_count, variant === 'full')}
                </span>
                
                {variant !== 'minimal' && entry.trend && showTrends && (
                  <span className={getTrendColorClass(entry.trend)}>
                    {entry.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                    {entry.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                    {entry.trend === 'new' && <Sparkles className="w-4 h-4" />}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User's rank if not in top N */}
      {variant === 'full' && leaderboard.user_rank && user && 
       !leaderboard.entries.some(e => e.is_current_user) && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-900/20 border border-green-600/30">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-green-500">
                Your Rank: #{leaderboard.user_rank.rank}
              </span>
              {leaderboard.user_rank.trend && (
                <span className={`text-xs ${getTrendColorClass(leaderboard.user_rank.trend)}`}>
                  {getTrendIndicator(leaderboard.user_rank.trend)}
                </span>
              )}
            </div>
            <span className="font-semibold text-green-500">
              {formatReferralCount(leaderboard.user_rank.referral_count, true)}
            </span>
          </div>
        </div>
      )}

      {/* View full leaderboard link for compact/minimal */}
      {variant !== 'full' && (
        <div className="mt-3 text-center">
          <a
            href="/waitlist"
            className="text-sm text-green-500 hover:text-green-400 transition-colors"
          >
            View full leaderboard →
          </a>
        </div>
      )}
    </div>
  );
};