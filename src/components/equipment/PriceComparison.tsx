import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, TrendingDown, Package, CheckCircle, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getPriceComparisonData, 
  trackPriceClick, 
  requestPriceUpdate,
  formatPrice,
  getRetailerDisplayName,
  getConditionBadgeVariant,
  formatCondition
} from '@/services/equipmentPrices';
import type { PriceComparisonData, ProductCondition } from '@/types/equipmentPrices';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PriceVerificationForm from './PriceVerificationForm';

interface PriceComparisonProps {
  equipmentId: string;
  equipmentName: string;
}

export default function PriceComparison({ equipmentId, equipmentName }: PriceComparisonProps) {
  const { user } = useAuth();
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(true);

  useEffect(() => {
    loadPrices();
  }, [equipmentId]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const data = await getPriceComparisonData(equipmentId);
      setPriceData(data);
    } catch (error) {
      console.error('Error loading prices:', error);
      toast.error('Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const updateRequested = await requestPriceUpdate(equipmentId);
      if (updateRequested) {
        toast.info('Price update requested. Please check back in a few minutes.');
      } else {
        toast.success('Prices are already up to date');
      }
      // Reload prices after a short delay
      setTimeout(() => loadPrices(), 2000);
    } catch (error) {
      toast.error('Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePriceClick = async (priceId: string, url: string) => {
    // Track the click
    await trackPriceClick(priceId, user?.id);
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredPrices = priceData?.prices.filter(price => {
    if (conditionFilter !== 'all') {
      const isUsed = price.retailer.toLowerCase().includes('used');
      if (conditionFilter === 'new' && isUsed) return false;
      if (conditionFilter === 'used' && !isUsed) return false;
    }
    if (inStockOnly && !price.in_stock) {
      return false;
    }
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!priceData || priceData.prices.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Pricing Available</p>
            <p className="text-muted-foreground mb-4">
              We're working on gathering prices for this equipment
            </p>
            <Button onClick={handleRefreshPrices} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Request Price Update
            </Button>
          </CardContent>
        </Card>

        {/* Price Verification Form */}
        <PriceVerificationForm
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          onPriceAdded={loadPrices}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="new">New Only</SelectItem>
              <SelectItem value="used">Used Only</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={inStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInStockOnly(!inStockOnly)}
          >
            In Stock Only
          </Button>
        </div>

        <Button
          onClick={handleRefreshPrices}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      {/* Price Statistics */}
      {filteredPrices.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Best Price</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPrice(priceData.bestPrice?.sale_price || priceData.bestPrice?.price || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-xl font-semibold">
                  {formatPrice(priceData.averagePrice)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price Range</p>
                <p className="text-xl font-semibold">
                  {formatPrice(priceData.priceRange.min)} - {formatPrice(priceData.priceRange.max)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retailers</p>
                <p className="text-xl font-semibold">{priceData.prices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Cards */}
      {filteredPrices.length > 0 ? (
        filteredPrices.map((price, index) => {
          const isSearchPage = price.retailer.includes('Search') || price.price > 99999;
          const isVerifiedProduct = !isSearchPage && price.in_stock;
          const isUserVerified = price.source === 'user_verified';
          
          return (
            <Card 
              key={price.id} 
              className={`
                ${index === 0 && isVerifiedProduct ? 'ring-2 ring-green-500' : ''}
                ${isUserVerified ? 'border-blue-200 dark:border-blue-800' : ''}
              `}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {price.retailer.replace(' (Search)', '').replace(' (Verified)', '')}
                      </h3>
                      {index === 0 && isVerifiedProduct && (
                        <Badge variant="default" className="bg-green-600">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Best Deal
                        </Badge>
                      )}
                      {isUserVerified && (
                        <Badge variant="default" className="bg-blue-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          User Verified
                        </Badge>
                      )}
                      {price.retailer.toLowerCase().includes('used') && (
                        <Badge variant="secondary">
                          Used
                        </Badge>
                      )}
                      {isSearchPage && (
                        <Badge variant="outline">
                          Search Only
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-3 mb-3">
                      {isSearchPage ? (
                        <span className="text-lg text-muted-foreground">
                          Price not verified - click to search
                        </span>
                      ) : (
                        <span className="text-3xl font-bold">
                          {formatPrice(price.price)}
                        </span>
                      )}
                    </div>

                    {/* User verification info */}
                    {isUserVerified && price.verified_by && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-3">
                        <User className="w-4 h-4" />
                        <span>Verified by @{price.verified_by}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {price.in_stock ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Package className="w-4 h-4" />
                          In Stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <Package className="w-4 h-4" />
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => handlePriceClick(price.id, price.affiliate_url || price.url)}
                    variant={(price.retailer.includes('Search') || price.price > 99999) ? 'outline' : (price.in_stock ? 'default' : 'outline')}
                    title={price.url}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {isSearchPage ? 'Search Retailer' : 'View Product'}
                  </Button>
                </div>

                {/* Last updated info */}
                {price.recorded_at && (
                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                    Last checked: {new Date(price.recorded_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No prices match your current filters
            </p>
          </CardContent>
        </Card>
      )}

      {/* Price Verification Form */}
      <PriceVerificationForm
        equipmentId={equipmentId}
        equipmentName={equipmentName}
        onPriceAdded={loadPrices}
      />
    </div>
  );
}