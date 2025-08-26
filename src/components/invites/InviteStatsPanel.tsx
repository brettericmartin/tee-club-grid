import { TrendingUp, Users, Gift, Target, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface InviteStats {
  totalInvites: number;
  successfulInvites: number;
  pendingInvites: number;
  successRate: number;
  bonusInvitesEarned: number;
}

interface InviteStatsPanelProps {
  stats: InviteStats;
  className?: string;
}

export function InviteStatsPanel({ stats, className }: InviteStatsPanelProps) {
  // Calculate viral coefficient (simplified)
  const viralCoefficient = stats.totalInvites > 0 
    ? (stats.successfulInvites / stats.totalInvites).toFixed(2)
    : '0.00';
  
  // Calculate progress to next bonus (every 3 successful referrals)
  const progressToNextBonus = stats.successfulInvites % 3;
  const progressPercentage = (progressToNextBonus / 3) * 100;
  
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Total Invites Sent */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Total Invites</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalInvites}
              </p>
              {stats.pendingInvites > 0 && (
                <p className="text-xs text-white/50 mt-1">
                  {stats.pendingInvites} pending
                </p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Successful Referrals */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Successful</p>
              <p className="text-2xl font-bold text-white">
                {stats.successfulInvites}
              </p>
              <p className="text-xs text-emerald-400 mt-1">
                {stats.successRate}% success rate
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bonus Invites Earned */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Bonus Earned</p>
              <p className="text-2xl font-bold text-white">
                {stats.bonusInvitesEarned}
              </p>
              <p className="text-xs text-amber-400 mt-1">
                +1 every 3 referrals
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Viral Coefficient */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">Viral Score</p>
              <p className="text-2xl font-bold text-white">
                {viralCoefficient}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {parseFloat(viralCoefficient) >= 1 ? 'Viral!' : 'Keep sharing'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Progress to Next Bonus */}
      {stats.successfulInvites > 0 && progressToNextBonus > 0 && (
        <Card className="bg-primary/10 border-primary/20 md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">
                  Progress to Next Bonus Invite
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {progressToNextBonus}/3 successful referrals
                </p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-white/50 mt-2">
              Refer {3 - progressToNextBonus} more {3 - progressToNextBonus === 1 ? 'user' : 'users'} to earn a bonus invite!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}