import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PriceVerificationFormProps {
  equipmentId: string;
  equipmentName: string;
  onPriceAdded?: () => void;
}

export default function PriceVerificationForm({ 
  equipmentId, 
  equipmentName,
  onPriceAdded 
}: PriceVerificationFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    retailer: '',
    price: '',
    url: '',
    condition: 'new',
    inStock: 'true'
  });

  const retailers = [
    'Amazon',
    'TaylorMade Direct',
    'Callaway Direct',
    'Titleist Direct',
    'Ping Direct',
    'PGA Tour Superstore',
    'Golf Galaxy',
    '2nd Swing Golf',
    'TGW',
    'Other'
  ];

  const validateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // Check if it's a search page
      if (url.includes('/search') || url.includes('/s?') || url.includes('?q=')) {
        return { valid: false, error: 'Please provide a direct product page, not a search page' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Please enter a valid URL' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to submit prices');
      return;
    }

    // Validate URL
    const urlValidation = validateUrl(formData.url);
    if (!urlValidation.valid) {
      toast.error(urlValidation.error);
      return;
    }

    // Validate price
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0 || price > 10000) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      // Add the user-verified price to price_verifications table
      const { error } = await supabase
        .from('price_verifications')
        .insert({
          equipment_id: equipmentId,
          user_id: user.id,
          price: price,
          retailer_name: formData.retailer + (formData.condition !== 'new' ? ` (${formData.condition})` : ''),
          product_url: formData.url,
          verified_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Price verification submitted! Thank you for helping improve price accuracy.');
      
      // Reset form
      setFormData({
        retailer: '',
        price: '',
        url: '',
        condition: 'new',
        inStock: 'true'
      });

      // Refresh prices
      if (onPriceAdded) {
        onPriceAdded();
      }
    } catch (error) {
      console.error('Error submitting price:', error);
      toast.error('Failed to submit price. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Submit Price Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Help improve price accuracy!</p>
              <p className="text-muted-foreground">
                Submit prices you've personally verified. Your contributions help other golfers find the best deals.
                Provide direct product page URLs (not search results) for accurate verification.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retailer">Retailer</Label>
              <Select 
                value={formData.retailer}
                onValueChange={(value) => setFormData({...formData, retailer: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select retailer" />
                </SelectTrigger>
                <SelectContent>
                  {retailers.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="599.99"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="url">Product URL (Direct link to product page)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://www.retailer.com/product-page"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be a direct product page, not search results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={formData.condition}
                onValueChange={(value) => setFormData({...formData, condition: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used-like-new">Used - Like New</SelectItem>
                  <SelectItem value="used-excellent">Used - Excellent</SelectItem>
                  <SelectItem value="used-good">Used - Good</SelectItem>
                  <SelectItem value="used-fair">Used - Fair</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="inStock">Availability</Label>
              <Select 
                value={formData.inStock}
                onValueChange={(value) => setFormData({...formData, inStock: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">In Stock</SelectItem>
                  <SelectItem value="false">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.retailer || !formData.price || !formData.url}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Price Verification'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}