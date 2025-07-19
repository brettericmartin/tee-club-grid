import { Plus, Briefcase, Trophy, Calendar, Star, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { setPrimaryBag } from '@/services/bags';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Bag {
  id: string;
  name: string;
  bag_type: string;
  created_at: string;
  is_primary?: boolean;
  user_id?: string;
}

interface BagSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bags: Bag[];
  onSelectBag: (bagId: string) => void;
  onCreateNew: () => void;
  onBagsUpdate?: () => void;
}

export function BagSelectorDialog({
  isOpen,
  onClose,
  bags,
  onSelectBag,
  onCreateNew,
  onBagsUpdate,
}: BagSelectorDialogProps) {
  const [updatingPrimary, setUpdatingPrimary] = useState<string | null>(null);

  const handleSelectBag = (bagId: string) => {
    onSelectBag(bagId);
    onClose();
  };

  const handleSetPrimary = async (e: React.MouseEvent, bag: Bag) => {
    e.stopPropagation();
    if (!bag.user_id || bag.is_primary) return;

    setUpdatingPrimary(bag.id);
    try {
      // setPrimaryBag will handle unsetting other bags via database trigger
      await setPrimaryBag(bag.user_id, bag.id);
      toast.success(`${bag.name} is now your primary bag`);
      
      // Call the update callback instead of reloading the page
      if (onBagsUpdate) {
        onBagsUpdate();
      }
    } catch (error) {
      toast.error('Failed to update primary bag');
      console.error('Error setting primary bag:', error);
    } finally {
      setUpdatingPrimary(null);
    }
  };

  const getBagIcon = (bagType: string) => {
    switch (bagType) {
      case 'tournament':
        return <Trophy className="w-5 h-5" />;
      case 'practice':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your Bags</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Create New Bag Button - Prominent at the top */}
          <Button
            className="w-full h-20 bg-primary hover:bg-primary/90 text-white group"
            onClick={() => {
              onClose();
              onCreateNew();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Create New Bag</div>
                <div className="text-sm opacity-80">Start building a new setup</div>
              </div>
            </div>
          </Button>

          {/* Existing Bags Grid */}
          {bags.length > 0 && (
            <>
              <div className="text-sm text-white/60 font-medium">Your Existing Bags</div>
              <ScrollArea className="h-[400px] pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bags.map((bag) => (
                    <Card
                      key={bag.id}
                      className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-colors group relative"
                      onClick={() => handleSelectBag(bag.id)}
                    >
                      {/* Primary Star Toggle - Always visible */}
                      <button
                        className={`absolute top-2 right-2 p-2 rounded-full transition-colors z-10 ${
                          bag.is_primary ? 'bg-primary/20' : 'hover:bg-white/10'
                        }`}
                        onClick={(e) => {
                          if (!bag.is_primary) {
                            handleSetPrimary(e, bag);
                          } else {
                            e.stopPropagation();
                          }
                        }}
                        disabled={bag.is_primary || updatingPrimary === bag.id}
                        title={bag.is_primary ? "This is your primary bag" : "Set as primary bag"}
                      >
                        <Star 
                          className={`w-5 h-5 transition-all ${
                            bag.is_primary 
                              ? 'fill-primary text-primary' 
                              : 'text-white/50 hover:text-white'
                          }`} 
                        />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                          {getBagIcon(bag.bag_type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                            {bag.name}
                          </h3>
                          <p className="text-sm text-white/60 capitalize">
                            {bag.bag_type.replace('_', ' ')} Bag
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            Created {formatDistanceToNow(new Date(bag.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}