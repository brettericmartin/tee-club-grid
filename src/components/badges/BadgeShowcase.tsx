import React, { useState } from 'react';
import { UserBadgeWithDetails } from '@/services/badgeService';
import { BadgeDisplay } from './BadgeDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeShowcaseProps {
  userBadges: UserBadgeWithDetails[];
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
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeWithDetails | null>(null);
  
  console.log('[BadgeShowcase] Received badges:', userBadges.length);
  console.log('[BadgeShowcase] First badge:', userBadges[0]);
  
  // Filter to only show earned badges
  const earnedBadges = userBadges.filter(ub => ub.progress === 100);
  console.log('[BadgeShowcase] Earned badges:', earnedBadges.length);
  
  const featuredBadges = earnedBadges.filter(ub => ub.is_featured).slice(0, 3);
  const displayBadges = featuredBadges.length > 0 ? featuredBadges : earnedBadges.slice(0, 3);

  if (earnedBadges.length === 0) {
    console.log('[BadgeShowcase] No earned badges, returning null');
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
        
        <BadgeDisplay 
          badges={displayBadges}
          size="sm"
          showEmpty={false}
          maxDisplay={3}
          onBadgeClick={(badge) => setSelectedBadge(badge)}
        />
      </div>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Badge Details</DialogTitle>
          </DialogHeader>
          
          {selectedBadge?.badge && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <BadgeDisplay 
                badges={[selectedBadge]}
                size="lg"
                showEmpty={false}
                maxDisplay={1}
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