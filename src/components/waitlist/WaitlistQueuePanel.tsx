import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Clock, Share2, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface QueuePosition {
  position: number;
  total_waiting: number;
  score: number;
  referral_count: number;
  estimated_days: number;
  wave_cap: number;
  wave_filled_today: number;
  ahead_of_you: number;
  behind_you: number;
  referral_boost: number;
  application_date: string;
  last_movement?: {
    direction: 'up' | 'down' | 'none';
    spots: number;
    timestamp: string;
  };
}

interface WaitlistQueuePanelProps {
  position: QueuePosition;
  onShare: () => void;
  className?: string;
}

export function WaitlistQueuePanel({ position, onShare, className }: WaitlistQueuePanelProps) {
  const [displayPosition, setDisplayPosition] = useState(position.position);
  const progressPercentage = ((position.total_waiting - position.position + 1) / position.total_waiting) * 100;
  
  // Animate position number changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPosition(position.position);
    }, 100);
    return () => clearTimeout(timer);
  }, [position.position]);
  
  // Format application date
  const applicationDate = new Date(position.application_date);
  const daysWaiting = Math.floor((Date.now() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Position Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            {/* Position Number */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayPosition}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="text-7xl font-bold text-white"
                >
                  #{displayPosition}
                </motion.div>
              </AnimatePresence>
              
              {position.last_movement && position.last_movement.spots > 0 && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute -right-8 top-0"
                >
                  <Badge className={cn(
                    'flex items-center gap-1',
                    position.last_movement.direction === 'up' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  )}>
                    {position.last_movement.direction === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {position.last_movement.spots}
                  </Badge>
                </motion.div>
              )}
            </div>
            
            <p className="text-xl text-white/80">
              of <span className="font-semibold">{position.total_waiting}</span> waiting
            </p>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-white/60">
                {Math.round(progressPercentage)}% through the queue
              </p>
            </div>
            
            {/* Queue Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{position.ahead_of_you}</p>
                <p className="text-sm text-white/60">ahead of you</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{position.behind_you}</p>
                <p className="text-sm text-white/60">behind you</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Your Stats Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Application Score</span>
              <Badge variant="secondary">{position.score}/100</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Days Waiting</span>
              <span className="text-sm font-medium text-white">{daysWaiting}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Referrals</span>
              <span className="text-sm font-medium text-white">{position.referral_count}</span>
            </div>
            {position.referral_boost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Position Boost</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  +{position.referral_boost} spots
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Estimated Wait Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Estimated Wait
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-white">
                {position.estimated_days === 0 ? 'Today!' : 
                 position.estimated_days === 1 ? 'Tomorrow' : 
                 `${position.estimated_days} days`}
              </p>
              <p className="text-sm text-white/60 mt-1">
                at current approval rate
              </p>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Today's Approvals</span>
                <span className="text-white">{position.wave_filled_today}/{position.wave_cap}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Share to Move Up Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-emerald-500/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Move Up the Queue
              </h3>
              <p className="text-sm text-white/60">
                Each successful referral moves you up 5 spots
              </p>
            </div>
            <Button
              onClick={onShare}
              className="bg-primary hover:bg-primary/90"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Now
            </Button>
          </div>
          
          {/* Potential Position */}
          {position.referral_count < 3 && (
            <div className="mt-4 p-3 bg-black/20 rounded-lg">
              <p className="text-sm text-white/80">
                💡 <span className="font-medium">Pro tip:</span> With {3 - position.referral_count} more referral{3 - position.referral_count > 1 ? 's' : ''}, 
                you could jump to position #{Math.max(1, position.position - ((3 - position.referral_count) * 5))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}