import { Plus, Briefcase, Trophy, Calendar, Settings, Trash2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';
import { setPrimaryBag, deleteBag } from '@/services/bags';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
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
  bags: propBags,
  onSelectBag,
  onCreateNew,
  onBagsUpdate,
}: BagSelectorDialogProps) {
  const [updatingPrimary, setUpdatingPrimary] = useState<string | null>(null);
  const [bags, setBags] = useState<Bag[]>(propBags);
  const [deletingBag, setDeletingBag] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bagToDelete, setBagToDelete] = useState<Bag | null>(null);
  
  // Update local state when props change
  useEffect(() => {
    setBags(propBags);
  }, [propBags]);
  
  // Refresh bags when dialog opens to ensure latest state
  useEffect(() => {
    if (isOpen && propBags.length > 0 && propBags[0].user_id) {
      const refreshBags = async () => {
        const { data: freshBags } = await supabase
          .from('user_bags')
          .select('*')
          .eq('user_id', propBags[0].user_id)
          .order('is_primary', { ascending: false })
          .order('updated_at', { ascending: false });
          
        if (freshBags) {
          setBags(freshBags);
        }
      };
      
      refreshBags();
    }
  }, [isOpen]);

  const handleSelectBag = (bagId: string) => {
    onSelectBag(bagId);
    onClose();
  };

  const handleSetPrimary = async (e: React.MouseEvent, bag: Bag) => {
    e.stopPropagation();
    if (!bag.user_id || bag.is_primary) return;

    setUpdatingPrimary(bag.id);
    
    // Optimistic update - immediately update UI
    const optimisticBags = bags.map(b => ({
      ...b,
      is_primary: b.id === bag.id
    }));
    setBags(optimisticBags);
    
    try {
      await setPrimaryBag(bag.user_id, bag.id);
      toast.success(`${bag.name} is now your primary bag`);
      
      // Fetch fresh data to ensure UI matches database
      const { data: updatedBags } = await supabase
        .from('user_bags')
        .select('*')
        .eq('user_id', bag.user_id)
        .order('is_primary', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (updatedBags) {
        setBags(updatedBags);
      }
      
      // Also call parent update if provided
      if (onBagsUpdate) {
        onBagsUpdate();
      }
    } catch (error) {
      // Revert optimistic update on error
      setBags(propBags);
      toast.error('Failed to update primary bag');
      console.error('Error setting primary bag:', error);
    } finally {
      setUpdatingPrimary(null);
    }
  };

  const handleDeleteBag = async () => {
    if (!bagToDelete || !bagToDelete.user_id) return;
    
    setDeletingBag(bagToDelete.id);
    
    try {
      await deleteBag(bagToDelete.id, bagToDelete.user_id);
      
      // Remove from local state
      setBags(bags.filter(b => b.id !== bagToDelete.id));
      
      toast.success(`${bagToDelete.name} has been deleted`);
      setShowDeleteConfirm(false);
      setBagToDelete(null);
      
      // Call parent update if provided
      if (onBagsUpdate) {
        onBagsUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bag');
      console.error('Error deleting bag:', error);
    } finally {
      setDeletingBag(null);
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
    <>
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
                      {/* Primary Bag Toggle Switch and Delete Button */}
                      <div 
                        className="absolute top-3 right-3 z-10 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Delete button - only show if user has more than 1 bag */}
                        {bags.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/50 hover:text-red-500 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBagToDelete(bag);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={deletingBag === bag.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <span className="text-xs text-white/50">Primary</span>
                        <Switch
                          checked={bag.is_primary || false}
                          onCheckedChange={async (checked) => {
                            if (checked && !bag.is_primary) {
                              await handleSetPrimary(new MouseEvent('click') as any, bag);
                            }
                            // Don't allow unchecking if it's the only primary bag
                          }}
                          disabled={updatingPrimary === bag.id}
                          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/20"
                        />
                      </div>
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

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent className="glass-card border-white/20 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl">Delete Bag</DialogTitle>
          </div>
          <DialogDescription className="text-white/70">
            Are you sure you want to delete <span className="font-semibold text-white">"{bagToDelete?.name}"</span>? 
            This will permanently remove the bag and all its equipment configurations. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteConfirm(false);
              setBagToDelete(null);
            }}
            disabled={!!deletingBag}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteBag}
            disabled={!!deletingBag}
          >
            {deletingBag ? 'Deleting...' : 'Delete Bag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}