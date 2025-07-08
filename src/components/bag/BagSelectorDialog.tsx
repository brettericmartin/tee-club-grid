import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Bag {
  id: string;
  name: string;
  bag_type: string;
  created_at: string;
}

interface BagSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bags: Bag[];
  onSelectBag: (bagId: string) => void;
  onCreateNew: () => void;
}

export function BagSelectorDialog({
  isOpen,
  onClose,
  bags,
  onSelectBag,
  onCreateNew,
}: BagSelectorDialogProps) {
  const handleSelectBag = (bagId: string) => {
    onSelectBag(bagId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Bag</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {bags.map((bag) => (
            <Card
              key={bag.id}
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelectBag(bag.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{bag.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {bag.bag_type.replace('_', ' ')} Bag
                  </p>
                </div>
              </div>
            </Card>
          ))}
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose();
              onCreateNew();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Bag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}