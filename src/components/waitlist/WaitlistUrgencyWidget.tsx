import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, AlertCircle, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BetaSummary {
  cap: number;
  approvedActive: number;
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
  wave_filled_today?: number;
}

interface WaitlistUrgencyWidgetProps {
  className?: string;
  variant?: 'floating' | 'inline' | 'banner';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function WaitlistUrgencyWidget({ 
  className, 
  variant = 'floating',
  position = 'bottom-right' 
}: WaitlistUrgencyWidgetProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BetaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [lastSpotTime, setLastSpotTime] = useState<Date | null>(null);
  
  useEffect(() => {
    fetchSummary();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    
    // Simulate viewer count
    setViewerCount(Math.floor(Math.random() * 20) + 5);
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => Math.max(3, prev + Math.floor(Math.random() * 5) - 2));
    }, 10000);
    
    // Simulate last spot taken
    setLastSpotTime(new Date(Date.now() - Math.random() * 30 * 60 * 1000));
    
    // Show widget after a delay
    setTimeout(() => setIsVisible(true), 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(viewerInterval);
    };
  }, []);
  
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/beta/summary');
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching beta summary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyClick = () => {
    navigate('/waitlist');
  };
  
  if (loading || !summary || summary.remaining === 0) {
    return null;
  }
  
  const urgencyLevel = summary.remaining <= 5 ? 'critical' : 
                       summary.remaining <= 10 ? 'high' : 
                       summary.remaining <= 20 ? 'medium' : 'low';
  
  const urgencyColor = {
    critical: 'bg-red-500 border-red-500',
    high: 'bg-orange-500 border-orange-500',
    medium: 'bg-yellow-500 border-yellow-500',
    low: 'bg-emerald-500 border-emerald-500'
  }[urgencyLevel];
  
  const urgencyTextColor = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-emerald-500'
  }[urgencyLevel];
  
  const urgencyBgColor = {
    critical: 'bg-red-500/10 border-red-500/20',
    high: 'bg-orange-500/10 border-orange-500/20',
    medium: 'bg-yellow-500/10 border-yellow-500/20',
    low: 'bg-emerald-500/10 border-emerald-500/20'
  }[urgencyLevel];
  
  const formatLastSpotTime = () => {
    if (!lastSpotTime) return 'just now';
    const minutes = Math.floor((Date.now() - lastSpotTime.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    return 'over an hour ago';
  };
  
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'bg-gradient-to-r p-4 border-b',
          urgencyLevel === 'critical' ? 'from-red-600 to-red-500 border-red-600' :
          urgencyLevel === 'high' ? 'from-orange-600 to-orange-500 border-orange-600' :
          urgencyLevel === 'medium' ? 'from-yellow-600 to-yellow-500 border-yellow-600' :
          'from-emerald-600 to-emerald-500 border-emerald-600',
          className
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {urgencyLevel === 'critical' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <AlertCircle className="w-5 h-5" />
                  </motion.div>
                )}
                <span className="font-bold text-lg">
                  {urgencyLevel === 'critical' ? `🔥 LAST ${summary.remaining} SPOTS!` :
                   urgencyLevel === 'high' ? `Only ${summary.remaining} spots left today!` :
                   `${summary.remaining} beta spots available`}
                </span>
              </div>
              
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{viewerCount} viewing now</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Last spot {formatLastSpotTime()}</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleApplyClick}
              size="sm"
              className="bg-white text-black hover:bg-white/90"
            >
              Apply Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'p-6 rounded-lg border',
          urgencyBgColor,
          className
        )}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={cn('text-lg font-bold', urgencyTextColor)}>
                {urgencyLevel === 'critical' ? '🔥 Final Spots Available!' :
                 'Limited Beta Access'}
              </h3>
              <p className="text-white/60 text-sm mt-1">
                Join now before spots fill up
              </p>
            </div>
            <Badge className={cn('px-3 py-1', urgencyBgColor, urgencyTextColor)}>
              {summary.remaining} left
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <Users className="w-4 h-4 text-white/60" />
              <span>{viewerCount} viewing</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="w-4 h-4 text-white/60" />
              <span>Last: {formatLastSpotTime()}</span>
            </div>
          </div>
          
          <Button
            onClick={handleApplyClick}
            className={cn('w-full', urgencyColor, 'text-white hover:opacity-90')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Claim Your Spot
          </Button>
        </div>
      </motion.div>
    );
  }
  
  // Floating widget (default)
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6'
  }[position];
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={cn(
            'fixed z-50 max-w-sm',
            positionClasses,
            className
          )}
        >
          <div className="relative">
            {/* Pulsing background for critical urgency */}
            {urgencyLevel === 'critical' && (
              <div className="absolute inset-0 bg-red-500 rounded-lg blur-xl opacity-30 animate-pulse" />
            )}
            
            <div className="relative bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl p-4">
              {/* Close button */}
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-white/40 hover:text-white/60"
              >
                ×
              </button>
              
              {/* Header */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  {urgencyLevel === 'critical' && (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      <AlertCircle className={cn('w-5 h-5', urgencyTextColor)} />
                    </motion.div>
                  )}
                  <h4 className={cn('font-bold', urgencyTextColor)}>
                    {urgencyLevel === 'critical' ? `Last ${summary.remaining} Spots!` :
                     urgencyLevel === 'high' ? 'Spots Filling Fast!' :
                     'Beta Access Open'}
                  </h4>
                </div>
                <p className="text-xs text-white/60">
                  Join before it's too late
                </p>
              </div>
              
              {/* Stats */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Spots remaining:</span>
                  <span className={cn('font-bold', urgencyTextColor)}>
                    {summary.remaining}/{summary.cap}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">People viewing:</span>
                  <span className="text-white">{viewerCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Last spot taken:</span>
                  <span className="text-white">{formatLastSpotTime()}</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <Button
                onClick={handleApplyClick}
                size="sm"
                className={cn(
                  'w-full',
                  urgencyLevel === 'critical' ? 'bg-red-500 hover:bg-red-600' :
                  urgencyLevel === 'high' ? 'bg-orange-500 hover:bg-orange-600' :
                  'bg-primary hover:bg-primary/90',
                  'text-white'
                )}
              >
                <Zap className="w-4 h-4 mr-2" />
                Apply Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}