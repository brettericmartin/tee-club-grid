import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Star, Trophy } from 'lucide-react';
import type { UserBadgeWithDetails } from '@/services/badgeService';

interface BadgeDisplayProps {
  badges: UserBadgeWithDetails[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showEmpty?: boolean;
  maxDisplay?: number;
  onBadgeClick?: (badge: UserBadgeWithDetails) => void;
}

// Helper function to get badge filename
function getBadgeFilename(badgeName: string): string {
  return badgeName.toLowerCase().replace(/\s+/g, '-') + '.svg';
}

// Rarity colors and effects
const rarityStyles = {
  common: 'bg-gray-800 border-gray-600',
  uncommon: 'bg-green-900/50 border-green-600',
  rare: 'bg-blue-900/50 border-blue-600',
  epic: 'bg-purple-900/50 border-purple-600',
  legendary: 'bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-600'
};

const rarityGlow = {
  common: '',
  uncommon: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]',
  rare: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
  epic: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
  legendary: 'shadow-[0_0_25px_rgba(245,158,11,0.6)]'
};

const BadgeDisplay = ({ 
  badges, 
  size = 'md', 
  showEmpty = true,
  maxDisplay = 6,
  onBadgeClick 
}: BadgeDisplayProps) => {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 sm:w-12 sm:h-12',
    md: 'w-10 h-10 sm:w-16 sm:h-16',
    lg: 'w-12 h-12 sm:w-20 sm:h-20',
    xl: 'w-14 h-14 sm:w-24 sm:h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4 sm:w-6 sm:h-6',
    md: 'w-5 h-5 sm:w-8 sm:h-8',
    lg: 'w-6 h-6 sm:w-10 sm:h-10',
    xl: 'w-7 h-7 sm:w-12 sm:h-12'
  };

  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  // Fill empty slots if needed
  const emptySlots = showEmpty ? Math.max(0, maxDisplay - displayBadges.length) : 0;

  return (
    <div className={cn(
      "grid gap-3",
      size === 'xl' ? "grid-cols-4 sm:grid-cols-8 gap-2" : "grid-cols-3 sm:grid-cols-6"
    )}>
      {displayBadges.map((userBadge) => {
        const rarity = userBadge.badge.rarity || 'common';
        const badgeIcon = userBadge.badge.icon;
        const isImageUrl = badgeIcon?.startsWith('/') || badgeIcon?.startsWith('http');
        
        return (
          <div
            key={userBadge.id}
            className="relative group"
            onMouseEnter={() => setHoveredBadge(userBadge.id)}
            onMouseLeave={() => setHoveredBadge(null)}
          >
            <div
              className={cn(
                "relative flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden",
                sizeClasses[size],
                "hover:scale-110",
                onBadgeClick && "hover:brightness-125"
              )}
              onClick={() => onBadgeClick?.(userBadge)}
            >
              {isImageUrl ? (
                <img 
                  src={badgeIcon}
                  alt={userBadge.badge.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">{badgeIcon || '🏅'}</span>
              )}
            </div>

            {/* Tooltip */}
            {hoveredBadge === userBadge.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
                <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                  <p className="font-semibold text-sm">{userBadge.badge.display_name}</p>
                  <p className="text-xs text-gray-400">{userBadge.badge.description}</p>
                  {userBadge.badge.category && (
                    <p className="text-xs text-gray-500 mt-1">{userBadge.badge.category.display_name}</p>
                  )}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-2">
                  <div className="border-8 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty slots */}
      {showEmpty && Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`empty-${index}`}
          className={cn(
            "flex items-center justify-center",
            sizeClasses[size]
          )}
        >
          <Trophy className={cn(iconSizes[size], "text-gray-700")} />
        </div>
      ))}

    </div>
  );
};

export { BadgeDisplay };