import { useState } from 'react';
import { Plus, ChevronDown, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface Bag {
  id: string;
  name: string;
  bag_type: string;
  is_primary: boolean;
  created_at: string;
}

interface BagSelectorProps {
  bags: Bag[];
  currentBag: Bag | undefined;
  onSelectBag: (bagId: string) => void;
  onCreateBag: (name: string, type: string) => Promise<void>;
}

export function BagSelector({
  bags,
  currentBag,
  onSelectBag,
  onCreateBag,
}: BagSelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBagName, setNewBagName] = useState('');
  const [newBagType, setNewBagType] = useState('real');
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
      await onCreateBag(newBagName, newBagType);
      setShowCreateDialog(false);
      setNewBagName('');
      setNewBagType('real');
      toast.success('Bag created successfully!');
    } catch (error) {
      toast.error('Failed to create bag');
    } finally {
      setCreating(false);
    }
  };

  if (!currentBag) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <span className="font-semibold">{currentBag.name}</span>
            {currentBag.is_primary && <Star className="w-4 h-4 fill-primary text-primary" />}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {bags.map((bag) => (
            <DropdownMenuItem
              key={bag.id}
              onClick={() => onSelectBag(bag.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={bag.id === currentBag.id ? 'font-semibold' : ''}>
                  {bag.name}
                </span>
                {bag.is_primary && <Star className="w-3 h-3 fill-primary text-primary" />}
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {bag.bag_type.replace('_', ' ')}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Create New Bag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBag} disabled={creating}>
                {creating ? 'Creating...' : 'Create Bag'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}