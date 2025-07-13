import React from 'react';
import { UserBadge } from '@/services/badges';
import { BadgeDisplay } from './BadgeDisplay';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeProgressProps {
  userBadge: UserBadge;
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
}

export function BadgeProgress({ 
  userBadge, 
  showProgress = true, 
  onClick,
  className 
}: BadgeProgressProps) {
  const isEarned = userBadge.progress === 100;

  if (!userBadge.badge) return null;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10',
        'hover:bg-white/10 transition-all cursor-pointer',
        isEarned && 'ring-2 ring-primary/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <BadgeDisplay badge={userBadge.badge} size="md" showTier={false} />
          {isEarned && (
            <CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-white">{userBadge.badge.name}</h4>
          <p className="text-sm text-white/70 mt-1">{userBadge.badge.description}</p>
          
          {showProgress && !isEarned && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span>Progress</span>
                <span>{userBadge.progress}%</span>
              </div>
              <Progress value={userBadge.progress} className="h-2" />
            </div>
          )}
          
          {isEarned && userBadge.earned_at && (
            <p className="text-xs text-primary mt-2">
              Earned {new Date(userBadge.earned_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      <div className="absolute top-2 right-2">
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          'bg-gradient-to-r text-white font-medium',
          userBadge.badge.tier === 'bronze' && 'from-orange-600 to-orange-700',
          userBadge.badge.tier === 'silver' && 'from-gray-400 to-gray-500',
          userBadge.badge.tier === 'gold' && 'from-yellow-500 to-yellow-600',
          userBadge.badge.tier === 'platinum' && 'from-gray-300 to-gray-400',
          userBadge.badge.tier === 'diamond' && 'from-blue-400 to-blue-500'
        )}>
          {userBadge.badge.tier}
        </span>
      </div>
    </div>
  );
}