import { FC, useEffect, useState } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FilterModal from './FilterModal';
import { supabase } from '@/lib/supabase';

interface BrandFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBrand: string;
  onSelect: (brand: string) => void;
  savedEquipment?: any[]; // Optional: to show only brands from saved equipment
}

// Popular golf brands to show at the top
const POPULAR_BRANDS = [
  'TaylorMade',
  'Callaway', 
  'Titleist',
  'Ping',
  'Cobra',
  'Mizuno',
  'Cleveland',
  'Srixon'
];

// Brand tile component
const BrandTile: FC<{
  brand: string;
  isSelected: boolean;
  onClick: () => void;
  isPopular?: boolean;
}> = ({ brand, isSelected, onClick, isPopular }) => {
  const getBrandInitials = (brandName: string) => {
    return brandName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className={cn(
        "glass-card p-4 cursor-pointer transition-all duration-200 group relative",
        "hover:scale-[1.02] hover:bg-white/15",
        isSelected && "ring-2 ring-primary bg-primary/10"
      )}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 mb-2 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
          <span className="text-lg font-bold text-white/80">
            {getBrandInitials(brand)}
          </span>
        </div>
        <div className={cn(
          "font-medium text-sm transition-colors",
          isSelected ? "text-primary" : "text-white group-hover:text-primary"
        )}>
          {brand}
        </div>
        {isPopular && (
          <Badge variant="secondary" className="mt-1 text-xs">
            Popular
          </Badge>
        )}
      </div>
    </Card>
  );
};

const BrandFilterModal: FC<BrandFilterModalProps> = ({
  isOpen,
  onClose,
  selectedBrand,
  onSelect,
  savedEquipment
}) => {
  const [localSelected, setLocalSelected] = useState(selectedBrand);
  const [searchQuery, setSearchQuery] = useState('');
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLocalSelected(selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    if (isOpen) {
      loadBrands();
    }
  }, [isOpen, savedEquipment]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      if (savedEquipment && savedEquipment.length > 0) {
        // Get unique brands from saved equipment
        const brands = [...new Set(savedEquipment.map(item => item.brand))].filter(Boolean).sort();
        setAllBrands(brands);
      } else {
        // Load all brands from database
        const { data, error } = await supabase
          .from('equipment')
          .select('brand')
          .order('brand');

        if (data && !error) {
          const uniqueBrands = [...new Set(data.map(item => item.brand))].filter(Boolean);
          setAllBrands(uniqueBrands);
        }
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (brand: string) => {
    setLocalSelected(brand);
    onSelect(brand);
    onClose();
  };

  // Filter brands based on search
  const filteredBrands = allBrands.filter(brand => 
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate popular and other brands
  const popularBrands = filteredBrands.filter(brand => POPULAR_BRANDS.includes(brand));
  const otherBrands = filteredBrands.filter(brand => !POPULAR_BRANDS.includes(brand));

  return (
    <FilterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Brand"
    >
      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands..."
          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          {/* All Brands Option */}
          <div className="mb-6">
            <Button
              variant={localSelected === 'all' ? 'default' : 'outline'}
              className="w-full glass-button"
              onClick={() => handleSelect('all')}
            >
              All Brands
              {localSelected === 'all' && <Check className="w-4 h-4 ml-2" />}
            </Button>
          </div>

          {/* Popular Brands */}
          {popularBrands.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white/60 mb-3">Popular Brands</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {popularBrands.map(brand => (
                  <BrandTile
                    key={brand}
                    brand={brand}
                    isSelected={localSelected === brand}
                    onClick={() => handleSelect(brand)}
                    isPopular
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Other Brands */}
          {otherBrands.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-3">
                {popularBrands.length > 0 ? 'Other Brands' : 'All Brands'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {otherBrands.map(brand => (
                  <BrandTile
                    key={brand}
                    brand={brand}
                    isSelected={localSelected === brand}
                    onClick={() => handleSelect(brand)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredBrands.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/50">No brands found matching "{searchQuery}"</p>
            </div>
          )}
        </>
      )}
    </FilterModal>
  );
};

export default BrandFilterModal;