import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Approval {
  id: string;
  name: string;
  location: string;
  timestamp: string;
}

interface RecentApprovalsTickerProps {
  className?: string;
  compact?: boolean;
}

// Generate mock approvals for demonstration
// In production, this would come from an API endpoint
function generateMockApprovals(): Approval[] {
  const names = [
    'Sarah M.', 'Mike L.', 'Alex K.', 'John D.', 'Emma W.',
    'Chris P.', 'Lisa R.', 'David T.', 'Amy S.', 'Ryan B.'
  ];
  
  const locations = [
    'California', 'Texas', 'New York', 'Florida', 'Arizona',
    'Colorado', 'Washington', 'Oregon', 'Nevada', 'Georgia'
  ];
  
  const approvals: Approval[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const minutesAgo = Math.floor(Math.random() * 60) + i * 15;
    
    approvals.push({
      id: `approval-${i}`,
      name: randomName,
      location: randomLocation,
      timestamp: new Date(now - minutesAgo * 60 * 1000).toISOString()
    });
  }
  
  return approvals.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = Math.floor((now - time) / 1000); // in seconds
  
  if (diff < 60) return 'just now';
  if (diff < 120) return '1 min ago';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 7200) return '1 hour ago';
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return 'today';
}

export function RecentApprovalsTicker({ className, compact = false }: RecentApprovalsTickerProps) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    // Initial load
    setApprovals(generateMockApprovals());
    
    // Refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      setApprovals(generateMockApprovals());
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  useEffect(() => {
    // Rotate through approvals
    if (approvals.length === 0) return;
    
    const rotateInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % approvals.length);
    }, 4000);
    
    return () => clearInterval(rotateInterval);
  }, [approvals.length]);
  
  if (approvals.length === 0) return null;
  
  if (compact) {
    // Compact single-line ticker for banners
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-white/80"
          >
            <span className="font-medium">{approvals[currentIndex].name}</span>
            <span className="text-white/60">from</span>
            <span>{approvals[currentIndex].location}</span>
            <span className="text-white/60">•</span>
            <span className="text-emerald-400">Approved!</span>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
  
  // Full ticker with multiple items
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
        Recent Approvals
      </h3>
      
      <div className="space-y-2 max-h-[200px] overflow-hidden">
        <AnimatePresence initial={false}>
          {approvals.slice(0, 3).map((approval, index) => (
            <motion.div
              key={approval.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                transition: { delay: index * 0.1 }
              }}
              exit={{ x: 20, opacity: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{approval.name}</span>
                  <div className="flex items-center gap-1 text-white/60">
                    <MapPin className="w-3 h-3" />
                    <span className="text-sm">{approval.location}</span>
                  </div>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  {formatTimeAgo(approval.timestamp)}
                </p>
              </div>
              
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                Approved
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-white/40">
          {approvals.length} people approved in the last hour
        </p>
      </div>
    </div>
  );
}

// Missing Badge component import
import { Badge } from '@/components/ui/badge';