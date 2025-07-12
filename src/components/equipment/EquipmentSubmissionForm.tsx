import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { submitEquipment, searchEquipmentForDuplicates } from '@/services/communityEquipment';
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';
import { useToast } from '@/hooks/use-toast';

interface EquipmentSubmissionFormProps {
  onSuccess?: () => void;
}

export default function EquipmentSubmissionForm({ onSuccess }: EquipmentSubmissionFormProps) {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    category: '',
    year: new Date().getFullYear(),
    msrp: '',
    image_url: '',
    specs: {
      shaft_options: [],
      loft_options: [],
      hand: ['Right', 'Left']
    }
  });
  
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [similarEquipment, setSimilarEquipment] = useState<any[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  
  const { toast } = useToast();

  // Search for duplicates as user types
  const handleModelChange = async (value: string) => {
    setFormData({ ...formData, model: value });
    
    if (value.length > 2 && formData.brand) {
      setSearching(true);
      try {
        const results = await searchEquipmentForDuplicates(`${formData.brand} ${value}`);
        setSimilarEquipment(results || []);
        setShowSimilar(results && results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    } else {
      setSimilarEquipment([]);
      setShowSimilar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const result = await submitEquipment({
        ...formData,
        msrp: formData.msrp ? parseFloat(formData.msrp) : undefined
      });
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
          duration: 5000
        });
        
        // Reset form
        setFormData({
          brand: '',
          model: '',
          category: '',
          year: new Date().getFullYear(),
          msrp: '',
          image_url: '',
          specs: {
            shaft_options: [],
            loft_options: [],
            hand: ['Right', 'Left']
          }
        });
        
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Equipment already exists',
          description: 'This equipment is already in our database',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit equipment',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Add New Equipment</CardTitle>
        <CardDescription>
          Help build our community database by adding equipment that's missing.
          Our AI will review your submission to prevent duplicates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Brand Selection */}
          <div>
            <Label htmlFor="brand">Brand</Label>
            <select
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg"
              required
            >
              <option value="">Select a brand</option>
              <option value="TaylorMade">TaylorMade</option>
              <option value="Callaway">Callaway</option>
              <option value="Titleist">Titleist</option>
              <option value="Ping">Ping</option>
              <option value="Cobra">Cobra</option>
              <option value="Mizuno">Mizuno</option>
              <option value="Cleveland">Cleveland</option>
              <option value="Srixon">Srixon</option>
              <option value="Wilson">Wilson</option>
              <option value="Odyssey">Odyssey</option>
              <option value="Scotty Cameron">Scotty Cameron</option>
              <option value="PXG">PXG</option>
              <option value="Honma">Honma</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Model Input with Duplicate Detection */}
          <div>
            <Label htmlFor="model">Model Name</Label>
            <div className="relative">
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleModelChange(e.target.value)}
                placeholder="e.g., Qi10 LS, Stealth 2 Plus"
                required
                className="pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Don't include the brand name in the model (e.g., use "Qi10" not "TaylorMade Qi10")
            </p>
            
            {/* Similar Equipment Warning */}
            {showSimilar && (
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Similar equipment found:</p>
                  {similarEquipment.map(item => (
                    <div key={item.id} className="text-sm">
                      • {item.brand} {item.model}
                    </div>
                  ))}
                  <p className="mt-2 text-xs">
                    Make sure your equipment is different (e.g., Qi10 vs Qi10 LS are different models)
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg"
              required
            >
              <option value="">Select a category</option>
              {Object.entries(EQUIPMENT_CATEGORIES).map(([key, value]) => (
                <option key={value} value={value}>
                  {CATEGORY_DISPLAY_NAMES[value]}
                </option>
              ))}
            </select>
          </div>

          {/* Year and MSRP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Release Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="2000"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <Label htmlFor="msrp">MSRP ($)</Label>
              <Input
                id="msrp"
                type="number"
                value={formData.msrp}
                onChange={(e) => setFormData({ ...formData, msrp: e.target.value })}
                placeholder="599"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <Label htmlFor="image_url">Image URL (Optional)</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/product-image.jpg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Provide a link to an official product image if available
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || !formData.brand || !formData.model || !formData.category}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit Equipment
              </>
            )}
          </Button>
        </form>

        {/* Community Guidelines */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Community Guidelines</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Ensure the equipment doesn't already exist in our database</li>
            <li>• Use the official product name without the brand</li>
            <li>• Different variants (LS, Max, Tour) are separate entries</li>
            <li>• Provide accurate pricing and year information</li>
            <li>• Your submission helps other golfers make informed decisions!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}