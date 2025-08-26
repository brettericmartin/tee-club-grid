import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { trackBetaSummaryView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RecentApprovalsTicker } from "./RecentApprovalsTicker";

interface BetaSummary {
  cap: number;
  approved: number;          // Deprecated
  approvedActive: number;    // Active beta users
  approvedTotal: number;     // Total beta users (including soft-deleted)
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
}

interface WaitlistBannerProps {
  showApprovals?: boolean;
  variant?: 'default' | 'urgent';
}

export function WaitlistBanner({ showApprovals = false, variant = 'default' }: WaitlistBannerProps) {
  const [summary, setSummary] = useState<BetaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [waveClosesIn, setWaveClosesIn] = useState<string>('');

  useEffect(() => {
    fetchSummary();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    
    // Update wave countdown
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setWaveClosesIn(`${hours}h ${minutes}m`);
    };
    
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);
    
    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/beta/summary');
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
        
        // Track beta summary view (use approvedActive for accurate count)
        trackBetaSummaryView({
          approved: data.approvedActive || data.approved,
          cap: data.cap,
          remaining: data.remaining
        });
      }
    } catch (error) {
      console.error('Error fetching beta summary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getUrgencyLevel = (remaining: number) => {
    if (remaining <= 5) return 'critical';
    if (remaining <= 10) return 'high';
    if (remaining <= 20) return 'medium';
    return 'low';
  };
  
  const urgencyLevel = summary ? getUrgencyLevel(summary.remaining) : 'low';
  
  const bannerColors = {
    critical: 'from-red-600 to-red-500 border-red-600',
    high: 'from-orange-600 to-orange-500 border-orange-600',
    medium: 'from-yellow-600 to-yellow-500 border-yellow-600',
    low: 'from-emerald-600 to-emerald-500 border-emerald-600'
  };

  return (
    <div className={cn(
      "sticky top-16 z-40 bg-gradient-to-r border-b",
      variant === 'urgent' && urgencyLevel !== 'low' 
        ? bannerColors[urgencyLevel]
        : bannerColors.low
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            {/* Urgency Indicator */}
            {urgencyLevel === 'critical' && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">LAST {summary?.remaining} SPOTS!</span>
              </motion.div>
            )}
            
            {urgencyLevel === 'high' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">Only {summary?.remaining} spots left!</span>
              </div>
            )}
            
            {urgencyLevel === 'medium' && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">Limited spots remaining</span>
              </div>
            )}
            
            {urgencyLevel === 'low' && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-semibold">Closed Beta</span>
              </div>
            )}
            
            <div className="w-px h-4 bg-white/30" />
            
            {loading ? (
              <Skeleton className="h-5 w-24 bg-white/20" />
            ) : summary ? (
              <>
                {summary.publicBetaEnabled ? (
                  <span className="text-sm">Public Beta Now Open!</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      <span className="font-bold">{summary.approvedActive || summary.approved}/{summary.cap}</span> filled
                    </span>
                    {summary.remaining > 0 && (
                      <>
                        <div className="w-px h-4 bg-white/30" />
                        <span className="text-sm">
                          <span className="font-bold">{summary.remaining}</span> remaining
                        </span>
                      </>
                    )}
                    {waveClosesIn && urgencyLevel !== 'low' && (
                      <>
                        <div className="w-px h-4 bg-white/30" />
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          <span>Wave closes in {waveClosesIn}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm">Beta Access Available</span>
            )}
          </div>
          
          {/* Recent Approval Ticker (compact) */}
          {showApprovals && !loading && (
            <div className="hidden lg:block">
              <RecentApprovalsTicker compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}