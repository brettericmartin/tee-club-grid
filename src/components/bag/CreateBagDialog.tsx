import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface CreateBagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBag: (name: string, type: string, isPrimary?: boolean) => Promise<void>;
  hasExistingBags?: boolean;
}

export function CreateBagDialog({
  isOpen,
  onClose,
  onCreateBag,
  hasExistingBags = false,
}: CreateBagDialogProps) {
  const [newBagName, setNewBagName] = useState('');
  const [newBagType, setNewBagType] = useState('real');
  const [setAsPrimary, setSetAsPrimary] = useState(!hasExistingBags);
  const [creating, setCreating] = useState(false);

  const bagTypes = [
    { value: 'real', label: 'Real Bag', description: 'Your actual equipment' },
    { value: 'dream', label: 'Dream Bag', description: 'Your wishlist setup' },
    { value: 'tournament', label: 'Tournament Bag', description: 'Competition setup' },
    { value: 'seasonal', label: 'Seasonal Bag', description: 'Weather-specific setup' },
  ];

  const handleCreateBag = async () => {
    if (!newBagName.trim()) {
      toast.error('Please enter a bag name');
      return;
    }

    setCreating(true);
    try {
      await onCreateBag(newBagName, newBagType, setAsPrimary);
      onClose();
      setNewBagName('');
      setNewBagType('real');
      setSetAsPrimary(!hasExistingBags);
      toast.success('Bag created successfully!');
    } catch (error) {
      toast.error('Failed to create bag');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Bag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bag-name">Bag Name</Label>
            <Input
              id="bag-name"
              placeholder="e.g., Summer 2024 Setup"
              value={newBagName}
              onChange={(e) => setNewBagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBagName.trim()) {
                  handleCreateBag();
                }
              }}
            />
          </div>

          <div>
            <Label>Bag Type</Label>
            <RadioGroup value={newBagType} onValueChange={setNewBagType}>
              {bagTypes.map((type) => (
                <div key={type.value} className="flex items-start space-x-3 py-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="font-normal cursor-pointer">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.description}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {hasExistingBags && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="set-primary" 
                checked={setAsPrimary}
                onCheckedChange={(checked) => setSetAsPrimary(checked as boolean)}
              />
              <Label htmlFor="set-primary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Set as primary bag
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateBag} disabled={creating}>
              {creating ? 'Creating...' : 'Create Bag'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}