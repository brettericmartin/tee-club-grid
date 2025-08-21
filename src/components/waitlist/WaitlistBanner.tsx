import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { trackBetaSummaryView } from "@/utils/analytics";

interface BetaSummary {
  cap: number;
  approved: number;          // Deprecated
  approvedActive: number;    // Active beta users
  approvedTotal: number;     // Total beta users (including soft-deleted)
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
}

export function WaitlistBanner() {
  const [summary, setSummary] = useState<BetaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
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

  return (
    <div className="sticky top-16 z-40 bg-gradient-to-r from-emerald-600 to-emerald-500 border-b border-emerald-600">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-semibold">Closed Beta</span>
          </div>
          
          <div className="w-px h-4 bg-white/30" />
          
          {loading ? (
            <Skeleton className="h-5 w-24 bg-white/20" />
          ) : summary ? (
            <>
              {summary.publicBetaEnabled ? (
                <span className="text-sm">Public Beta Now Open!</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {summary.cap} spots
                  </span>
                  <div className="w-px h-4 bg-white/30" />
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
                </div>
              )}
            </>
          ) : (
            <span className="text-sm">Beta Access Available</span>
          )}
        </div>
      </div>
    </div>
  );
}