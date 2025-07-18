import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  checkBagUpdateEligibility, 
  getRecentBagUpdates,
  createBagUpdatePost,
  updateBagCreationPost
} from '@/services/feedServiceEnhanced';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface UseBagUpdatePromptProps {
  bagId: string;
  onUpdateComplete?: () => void;
}

export function useBagUpdatePrompt({ bagId, onUpdateComplete }: UseBagUpdatePromptProps) {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  // Check for updates periodically
  const checkForUpdates = async () => {
    if (!user || !bagId) return;

    try {
      // Get recent updates since last check
      const updates = await getRecentBagUpdates(bagId, lastCheckTime);
      
      if (updates.length === 0) return;

      // Check if we should prompt or auto-update
      const eligibility = await checkBagUpdateEligibility(bagId);

      if (eligibility.canUpdate && eligibility.originalPostId) {
        // Within 72 hours - update existing post
        await updateBagCreationPost(eligibility.originalPostId);
        toast.success('Bag updated in feed');
        setLastCheckTime(new Date());
      } else if (eligibility.shouldPrompt) {
        // After 72 hours - show prompt
        setRecentUpdates(updates);
        setShowPrompt(true);
      }
    } catch (error) {
      console.error('Error checking bag updates:', error);
    }
  };

  // Generate automatic message based on updates
  const generateMessage = () => {
    const added = recentUpdates.filter(u => u.update_type === 'added');
    const removed = recentUpdates.filter(u => u.update_type === 'removed');
    
    const parts = [];
    
    if (added.length > 0) {
      const firstItem = added[0].equipment;
      if (added.length === 1) {
        parts.push(`Added ${firstItem.brand} ${firstItem.model} to my bag`);
      } else {
        parts.push(`Added ${added.length} new items to my bag`);
      }
    }
    
    if (removed.length > 0) {
      if (parts.length > 0) parts.push('and');
      parts.push(`removed ${removed.length} item${removed.length > 1 ? 's' : ''}`);
    }
    
    return parts.join(' ');
  };

  const handleShare = async () => {
    if (!user || recentUpdates.length === 0) return;

    try {
      setIsPosting(true);
      
      await createBagUpdatePost({
        userId: user.id,
        bagId,
        updates: recentUpdates,
        message: customMessage || generateMessage()
      });

      toast.success('Bag update shared!');
      setShowPrompt(false);
      setRecentUpdates([]);
      setCustomMessage('');
      setLastCheckTime(new Date());
      
      if (onUpdateComplete) {
        onUpdateComplete();
      }
    } catch (error) {
      console.error('Error sharing update:', error);
      toast.error('Failed to share update');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSkip = () => {
    setShowPrompt(false);
    setRecentUpdates([]);
    setCustomMessage('');
    setLastCheckTime(new Date());
  };

  return {
    checkForUpdates,
    
    UpdatePrompt: () => (
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="bg-black/95 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Bag Update?</DialogTitle>
            <DialogDescription className="text-white/70">
              You've made changes to your bag. Would you like to share this update with your followers?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show what changed */}
            <div className="space-y-2">
              {recentUpdates.filter(u => u.update_type === 'added').map((update, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    {update.equipment.brand} {update.equipment.model}
                  </span>
                  <Badge variant="outline" className="text-xs bg-primary/20 text-primary border-primary/30">
                    Added
                  </Badge>
                </div>
              ))}
              
              {recentUpdates.filter(u => u.update_type === 'removed').map((update, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-red-400" />
                  <span className="text-sm line-through opacity-60">
                    {update.equipment.brand} {update.equipment.model}
                  </span>
                  <Badge variant="outline" className="text-xs bg-red-400/20 text-red-400 border-red-400/30">
                    Removed
                  </Badge>
                </div>
              ))}
            </div>

            {/* Custom message */}
            <Textarea
              placeholder={generateMessage()}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleSkip}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Skip
            </Button>
            <Button
              onClick={handleShare}
              disabled={isPosting}
              className="bg-primary hover:bg-primary/90"
            >
              {isPosting ? 'Sharing...' : 'Share Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  };
}