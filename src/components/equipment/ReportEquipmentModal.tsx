import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { reportEquipment } from '@/services/communityEquipment';
import { searchEquipment } from '@/services/equipment';

interface ReportEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
}

export default function ReportEquipmentModal({ 
  isOpen, 
  onClose, 
  equipmentId, 
  equipmentName 
}: ReportEquipmentModalProps) {
  const [reasonCode, setReasonCode] = useState<'duplicate' | 'incorrect_info' | 'spam' | 'other'>('duplicate');
  const [details, setDetails] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchEquipment(query);
      setSearchResults(results.filter((r: any) => r.id !== equipmentId));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (reasonCode === 'duplicate' && !duplicateOfId) {
      toast.error('Please select which equipment this is a duplicate of');
      return;
    }

    setSubmitting(true);
    try {
      await reportEquipment(
        equipmentId,
        reasonCode,
        details || undefined,
        duplicateOfId || undefined
      );
      
      toast.success('Thank you for helping improve our database!');
      onClose();
      
      // Reset form
      setReasonCode('duplicate');
      setDetails('');
      setDuplicateOfId('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-500" />
            Report Equipment Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Reporting:</p>
            <p className="text-sm text-muted-foreground">{equipmentName}</p>
          </div>

          <div>
            <Label>What's wrong with this equipment?</Label>
            <RadioGroup 
              value={reasonCode} 
              onValueChange={(value) => setReasonCode(value as any)}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duplicate" id="duplicate" />
                <Label htmlFor="duplicate" className="font-normal cursor-pointer">
                  Duplicate - This equipment already exists
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="incorrect_info" id="incorrect" />
                <Label htmlFor="incorrect" className="font-normal cursor-pointer">
                  Incorrect Information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam" className="font-normal cursor-pointer">
                  Spam or Not Real Equipment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">
                  Other Issue
                </Label>
              </div>
            </RadioGroup>
          </div>

          {reasonCode === 'duplicate' && (
            <div>
              <Label>Which equipment is this a duplicate of?</Label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for the original equipment..."
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg"
              />
              
              {searching && (
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              )}
              
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-lg">
                  {searchResults.map((equipment) => (
                    <button
                      key={equipment.id}
                      onClick={() => {
                        setDuplicateOfId(equipment.id);
                        setSearchQuery(`${equipment.brand} ${equipment.model}`);
                        setSearchResults([]);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${
                        duplicateOfId === equipment.id ? 'bg-muted' : ''
                      }`}
                    >
                      <p className="font-medium">{equipment.brand} {equipment.model}</p>
                      <p className="text-xs text-muted-foreground">{equipment.category}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional information that might help..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>Reports help us maintain a high-quality database.</p>
              <p className="mt-1">Equipment will be automatically hidden after multiple reports.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}