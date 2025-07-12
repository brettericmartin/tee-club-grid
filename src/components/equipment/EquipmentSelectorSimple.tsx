import { useState, useEffect } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_CATEGORIES as CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';
import { useCategoryImages } from '@/hooks/useCategoryImages';

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
  most_liked_photo?: string;
}

interface EquipmentSelectorSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
}

// Category icon mapping for fallback
const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    driver: '🏌️',
    fairway_wood: '🏌️',
    hybrid: '🏌️',
    iron: '⛳',
    wedge: '⛳',
    putter: '⛳',
    ball: '🏐',
    bag: '🎒',
    glove: '🧤',
    rangefinder: '📏',
    gps: '📡',
    accessories: '⚙️'
  };
  return icons[category] || '⚙️';
};

// Equipment image component with fallbacks (matches EquipmentSelectorImproved)
const EquipmentImageSimple = ({ 
  equipment, 
  categoryImages, 
  className 
}: {
  equipment: Equipment;
  categoryImages: Record<string, any>;
  className: string;
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Determine image source with fallback priority:
  // 1. Equipment-specific most liked photo
  // 2. equipment.image_url
  // 3. most liked photo from category
  // 4. brand initials
  const getImageSrc = () => {
    // First try equipment-specific most liked photo
    if (!imageError && equipment.most_liked_photo) {
      return equipment.most_liked_photo;
    }
    
    // Then try the original equipment image
    if (!imageError && equipment.image_url) {
      return equipment.image_url;
    }
    
    // Finally try category-level most liked photo
    const categoryImage = categoryImages[equipment.category];
    if (categoryImage?.imageUrl) {
      return categoryImage.imageUrl;
    }
    
    return null;
  };
  
  const imageSrc = getImageSrc();
  
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={`${equipment.brand} ${equipment.model}`}
        className={className}
        loading="lazy"
        onError={() => setImageError(true)}
      />
    );
  }
  
  // Fallback to brand initials
  const brandInitials = equipment.brand
    ?.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
    
  return (
    <div className={`${className} bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center`}>
      <span className="text-white font-bold text-lg">
        {brandInitials}
      </span>
    </div>
  );
};

// Equipment categories for selector - now using standardized values
const SELECTOR_CATEGORIES = [
  { value: 'driver', label: CATEGORY_DISPLAY_NAMES.driver },
  { value: 'fairway_wood', label: CATEGORY_DISPLAY_NAMES.fairway_wood },
  { value: 'hybrid', label: CATEGORY_DISPLAY_NAMES.hybrid },
  { value: 'iron', label: CATEGORY_DISPLAY_NAMES.iron },
  { value: 'wedge', label: CATEGORY_DISPLAY_NAMES.wedge },
  { value: 'putter', label: CATEGORY_DISPLAY_NAMES.putter },
  { value: 'ball', label: CATEGORY_DISPLAY_NAMES.ball },
  { value: 'bag', label: CATEGORY_DISPLAY_NAMES.bag },
  { value: 'glove', label: CATEGORY_DISPLAY_NAMES.glove },
  { value: 'rangefinder', label: CATEGORY_DISPLAY_NAMES.rangefinder },
  { value: 'gps', label: CATEGORY_DISPLAY_NAMES.gps },
  { value: 'accessories', label: CATEGORY_DISPLAY_NAMES.accessories },
];

export function EquipmentSelectorSimple({ isOpen, onClose, onSelect }: EquipmentSelectorSimpleProps) {
  const [step, setStep] = useState<'category' | 'brand' | 'equipment'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Load category images dynamically
  const categoryValues = SELECTOR_CATEGORIES.map(cat => cat.value);
  const { categoryImages, loading: imagesLoading } = useCategoryImages(categoryValues);

  // Debug: Log category images when they change
  useEffect(() => {
    console.log('🔍 Category images in component:', categoryImages);
  }, [categoryImages]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep('category');
      setSelectedCategory('');
      setSelectedBrand('');
      setSearchQuery('');
    }
  }, [isOpen]);

  // Load brands when category is selected
  useEffect(() => {
    if (selectedCategory) {
      loadBrands();
    }
  }, [selectedCategory]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('brand')
        .eq('category', selectedCategory)
        .order('brand');

      if (data && !error) {
        const uniqueBrands = [...new Set(data.map(item => item.brand))].filter(Boolean);
        setBrands(uniqueBrands);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    setLoading(true);
    try {
      console.log('🔍 EquipmentSelectorSimple: Loading equipment with photos:', { 
        category: selectedCategory, 
        brand: selectedBrand 
      });

      // Load equipment with most liked photos
      const { data: equipmentWithPhotos, error } = await supabase
        .from('equipment')
        .select(`
          id, 
          brand, 
          model, 
          category, 
          image_url,
          equipment_photos!left (
            photo_url,
            likes_count
          )
        `)
        .eq('brand', selectedBrand)
        .eq('category', selectedCategory)
        .order('model');

      if (error) throw error;

      // Process equipment to get most liked photo for each
      const processedEquipment = (equipmentWithPhotos || []).map(equipment => {
        const photos = equipment.equipment_photos || [];
        // Sort photos by likes and get the most liked one
        const mostLikedPhoto = photos
          .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
          .find(photo => photo.photo_url);

        return {
          id: equipment.id,
          brand: equipment.brand,
          model: equipment.model,
          category: equipment.category,
          image_url: equipment.image_url,
          most_liked_photo: mostLikedPhoto?.photo_url || null
        };
      });

      console.log('✅ EquipmentSelectorSimple: Loaded equipment with photos:', processedEquipment.length, 'items');
      console.log('📸 Items with photos:', processedEquipment.filter(e => e.most_liked_photo).length);
      
      setEquipment(processedEquipment);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('brand');
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setStep('equipment');
    loadEquipment();
  };

  const handleSelect = (item: Equipment) => {
    onSelect(item);
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 'category': return 'Select Equipment Type';
      case 'brand': return 'Select Brand';
      case 'equipment': return 'Select Model';
      default: return 'Select Equipment';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/20 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        {(selectedCategory || selectedBrand) && (
          <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
            {selectedCategory && (
              <>
                <span className="text-white">
                  {SELECTOR_CATEGORIES.find(c => c.value === selectedCategory)?.label}
                </span>
                {selectedBrand && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">{selectedBrand}</span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <ScrollArea className="h-[500px] pr-4">
          {/* Category Selection */}
          {step === 'category' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SELECTOR_CATEGORIES.map((category) => {
                const categoryImage = categoryImages[category.value];
                return (
                  <Card
                    key={category.value}
                    className="glass-card p-6 cursor-pointer hover:scale-[1.02] hover:bg-white/15 transition-[transform,colors] duration-200 group border-white/10"
                    onClick={() => handleCategorySelect(category.value)}
                  >
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                        {categoryImage?.imageUrl ? (
                          <img 
                            src={categoryImage.imageUrl}
                            alt={categoryImage.equipment}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                            title={`${categoryImage.equipment} (${categoryImage.likesCount} likes)`}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-white/60 text-2xl mb-1">
                              {getCategoryIcon(category.value)}
                            </div>
                            <div className="text-white/40 text-xs text-center leading-tight">
                              {categoryImage?.equipment ? categoryImage.equipment.split(' ')[0] : category.label}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-white group-hover:text-primary transition-colors text-sm leading-tight">
                        {category.label}
                      </div>
                      {categoryImage?.imageUrl && categoryImage.likesCount > 0 && (
                        <div className="text-xs text-white/40 mt-1">
                          {categoryImage.likesCount} ♥
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Brand Selection */}
          {step === 'brand' && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search brands..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {brands
                    .filter(brand => brand.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(brand => (
                      <Button
                        key={brand}
                        variant="outline"
                        className="glass-button justify-start"
                        onClick={() => handleBrandSelect(brand)}
                      >
                        {brand}
                      </Button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Equipment Selection */}
          {step === 'equipment' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  No equipment found
                </div>
              ) : (
                <div className="space-y-2">
                  {equipment.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center gap-3"
                    >
                      <EquipmentImageSimple 
                        equipment={item}
                        categoryImages={categoryImages}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.brand} {item.model}</div>
                        <div className="text-sm text-white/60">{item.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Back button */}
        {step !== 'category' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 'brand') {
                  setStep('category');
                  setSelectedCategory('');
                } else if (step === 'equipment') {
                  setStep('brand');
                  setSelectedBrand('');
                }
              }}
              className="text-white/60 hover:text-white"
            >
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}