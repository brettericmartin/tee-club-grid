import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Camera, Shield, Heart, DollarSign, Flag, Sunrise, 
  Trophy, Star, Zap, Award, Crown, Gem
} from 'lucide-react';
import type { UserBadgeWithDetails } from '@/services/badgeService';

interface BadgeDisplayProps {
  badges: UserBadgeWithDetails[];
  size?: 'sm' | 'md' | 'lg';
  showEmpty?: boolean;
  maxDisplay?: number;
  onBadgeClick?: (badge: UserBadgeWithDetails) => void;
}

// Map icon names to components
const iconMap: Record<string, any> = {
  camera: Camera,
  shield: Shield,
  heart: Heart,
  dollar: DollarSign,
  flag: Flag,
  sunrise: Sunrise,
  trophy: Trophy,
  star: Star,
  'golf-club': Trophy, // Fallback for golf club
  crown: Crown,
  gem: Gem,
  zap: Zap,
  award: Award
};

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
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  // Fill empty slots if needed
  const emptySlots = showEmpty ? Math.max(0, maxDisplay - displayBadges.length) : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {displayBadges.map((userBadge) => {
        const Icon = iconMap[userBadge.badge.icon_name || 'trophy'] || Trophy;
        const rarity = userBadge.badge.rarity || 'common';
        
        return (
          <div
            key={userBadge.id}
            className="relative group"
            onMouseEnter={() => setHoveredBadge(userBadge.id)}
            onMouseLeave={() => setHoveredBadge(null)}
          >
            <div
              className={cn(
                "relative flex items-center justify-center rounded-xl border-2 transition-all duration-300 cursor-pointer",
                sizeClasses[size],
                rarityStyles[rarity],
                rarityGlow[rarity],
                "hover:scale-110",
                onBadgeClick && "hover:brightness-125"
              )}
              onClick={() => onBadgeClick?.(userBadge)}
            >
              <Icon 
                className={cn(iconSizes[size], "transition-colors")}
                style={{ color: userBadge.badge.icon_color || '#10B981' }}
              />
              
              {/* Tier indicator for tiered badges */}
              {userBadge.badge.tier && userBadge.badge.tier > 1 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20">
                  <span className="text-xs font-bold text-white">{userBadge.badge.tier}</span>
                </div>
              )}

              {/* New badge indicator */}
              {!userBadge.notification_seen && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
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
            "flex items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/30",
            sizeClasses[size]
          )}
        >
          <Trophy className={cn(iconSizes[size], "text-gray-700")} />
        </div>
      ))}

      {/* More badges indicator */}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border-2 border-gray-600 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors",
            sizeClasses[size]
          )}
          onClick={() => onBadgeClick?.(displayBadges[0])} // You might want to show all badges modal
        >
          <span className="text-white font-bold">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
};

export { BadgeDisplay };