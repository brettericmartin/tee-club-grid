import React, { useState } from 'react';
import { UserBadge } from '@/services/badges';
import { BadgeDisplay } from './BadgeDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeShowcaseProps {
  userBadges: UserBadge[];
  userId: string;
  isOwnProfile?: boolean;
  className?: string;
}

export function BadgeShowcase({ 
  userBadges, 
  userId, 
  isOwnProfile = false,
  className 
}: BadgeShowcaseProps) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  
  // Filter to only show earned badges
  const earnedBadges = userBadges.filter(ub => ub.progress === 100);
  const featuredBadges = earnedBadges.filter(ub => ub.is_featured).slice(0, 3);
  const displayBadges = featuredBadges.length > 0 ? featuredBadges : earnedBadges.slice(0, 3);

  if (earnedBadges.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">Badges</h3>
          {earnedBadges.length > 3 && (
            <span className="text-xs text-white/50">
              {earnedBadges.length} earned
            </span>
          )}
        </div>
        
        <div className="flex gap-3">
          {displayBadges.map((userBadge) => (
            <button
              key={userBadge.id}
              onClick={() => setSelectedBadge(userBadge)}
              className="relative group"
            >
              {userBadge.badge && (
                <BadgeDisplay 
                  badge={userBadge.badge} 
                  size="sm"
                  showTier={false}
                  className="group-hover:scale-110 transition-transform"
                />
              )}
              {userBadge.is_featured && (
                <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 fill-current" />
              )}
            </button>
          ))}
          
          {earnedBadges.length > 3 && (
            <button
              onClick={() => {/* Navigate to full badges page */}}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="text-xs text-white/70">+{earnedBadges.length - 3}</span>
            </button>
          )}
        </div>
      </div>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Badge Details</DialogTitle>
          </DialogHeader>
          
          {selectedBadge?.badge && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <BadgeDisplay 
                badge={selectedBadge.badge} 
                size="lg"
                showTier={true}
              />
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  {selectedBadge.badge.name}
                </h3>
                <p className="text-white/70">
                  {selectedBadge.badge.description}
                </p>
                {selectedBadge.earned_at && (
                  <p className="text-sm text-primary">
                    Earned on {new Date(selectedBadge.earned_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {isOwnProfile && (
                <button
                  onClick={() => {
                    // Toggle featured status
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedBadge.is_featured
                      ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {selectedBadge.is_featured ? 'Featured' : 'Feature on Profile'}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}