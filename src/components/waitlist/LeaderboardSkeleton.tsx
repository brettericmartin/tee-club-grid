import React from 'react';

interface LeaderboardSkeletonProps {
  compact?: boolean;
  rows?: number;
}

export const LeaderboardSkeleton: React.FC<LeaderboardSkeletonProps> = ({ 
  compact = false,
  rows = 5 
}) => {
  return (
    <div className="space-y-2">
      {/* Header skeleton */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
      )}

      {/* Leaderboard rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-3 rounded-lg bg-gray-900/50 ${
            compact ? 'py-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-gray-800 rounded animate-pulse`} />
            
            {/* Avatar */}
            {!compact && (
              <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse" />
            )}
            
            {/* Name */}
            <div className={`${compact ? 'h-4 w-20' : 'h-5 w-32'} bg-gray-800 rounded animate-pulse`} />
          </div>

          {/* Referral count */}
          <div className="flex items-center gap-2">
            <div className={`${compact ? 'h-4 w-8' : 'h-5 w-12'} bg-gray-800 rounded animate-pulse`} />
            {!compact && (
              <div className="h-4 w-4 bg-gray-800 rounded animate-pulse" />
            )}
          </div>
        </div>
      ))}

      {/* User rank skeleton if not compact */}
      {!compact && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-900/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded animate-pulse" />
              <div className="h-5 w-24 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-16 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};