import { useState, useEffect } from 'react';
import { Search, ChevronRight, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { EQUIPMENT_CATEGORIES as STANDARD_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import SubmitEquipmentModal from '@/components/SubmitEquipmentModal';
import { toast } from 'sonner';

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  most_liked_photo?: string;
};
type Shaft = Database['public']['Tables']['shafts']['Row'];
type Grip = Database['public']['Tables']['grips']['Row'];

// Loft options by club type
const LOFT_OPTIONS: Record<string, string[]> = {
  driver: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'],
  fairway_wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
  hybrid: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'],
  wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°']
};

// Iron configuration options
const IRON_OPTIONS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'PW', 'AW', 'GW', 'SW', 'LW'
];

// Helper to get iron index for comparison
const getIronIndex = (iron: string) => {
  return IRON_OPTIONS.indexOf(iron);
};

interface EquipmentSelectorImprovedProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment: (equipment: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft?: string;
    iron_config?: {
      type: 'set' | 'single';
      from?: string;
      to?: string;
      single?: string;
    };
  }) => void;
}

// Equipment categories with metadata - using standardized values
const EQUIPMENT_CATEGORIES = Object.values(STANDARD_CATEGORIES).map(category => {
  // Define which categories have shafts, grips, and lofts
  const hasShaft = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(category);
  const hasGrip = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(category);
  const hasLoft = ['driver', 'fairway_wood', 'hybrid', 'wedge'].includes(category);
  
  // Choose appropriate icons
  const iconMap: Record<string, string> = {
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
    gps: '📍',
    tee: '⛳',
    towel: '🏷️',
    ball_marker: '🎯',
    divot_tool: '🔧',
    accessories: '🎒'
  };
  
  return {
    value: category,
    label: CATEGORY_DISPLAY_NAMES[category],
    icon: iconMap[category] || '⛳',
    hasShaft,
    hasGrip,
    hasLoft
  };
});

// Category tile component with dynamic images
const CategoryTile = ({ 
  category, 
  categoryImages, 
  onClick 
}: {
  category: typeof EQUIPMENT_CATEGORIES[0];
  categoryImages: Record<string, any>;
  onClick: () => void;
}) => {
  const [imageError, setImageError] = useState(false);
  
  const categoryImage = categoryImages[category.value];
  const hasImage = !imageError && categoryImage?.imageUrl;
  
  return (
    <Card
      className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-colors group"
      onClick={onClick}
    >
      <div className="text-center">
        {hasImage ? (
          <div className="w-16 h-16 mx-auto mb-2 rounded-lg overflow-hidden">
            <img
              src={categoryImage.imageUrl}
              alt={`${category.label} - ${categoryImage.equipment}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="text-3xl mb-2">{category.icon}</div>
        )}
        <div className="font-medium text-white group-hover:text-primary transition-colors">
          {category.label}
        </div>
        {hasImage && (
          <div className="text-xs text-white/50 mt-1 truncate">
            {categoryImage.equipment}
          </div>
        )}
      </div>
    </Card>
  );
};

// Equipment image component with fallbacks
const EquipmentImage = ({ 
  equipment, 
  categoryImages, 
  className = "w-20 h-20 object-cover rounded" 
}: {
  equipment: Equipment;
  categoryImages: Record<string, any>;
  className?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Determine image source with fallback priority:
  // 1. Equipment-specific most liked photo (NEW!)
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

export function EquipmentSelectorImproved({ isOpen, onClose, onSelectEquipment }: EquipmentSelectorImprovedProps) {
  // State management
  const [step, setStep] = useState<'category' | 'brand' | 'equipment' | 'iron_config' | 'shaft' | 'grip' | 'loft'>('category');
  const [selectedCategory, setSelectedCategory] = useState<typeof EQUIPMENT_CATEGORIES[0] | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Customization options
  const [shafts, setShafts] = useState<Shaft[]>([]);
  const [selectedShaft, setSelectedShaft] = useState<Shaft | null>(null);
  const [grips, setGrips] = useState<Grip[]>([]);
  const [selectedGrip, setSelectedGrip] = useState<Grip | null>(null);
  const [selectedLoft, setSelectedLoft] = useState<string>('');
  
  // Search states for shaft and grip
  const [shaftSearchQuery, setShaftSearchQuery] = useState<string>('');
  const [gripSearchQuery, setGripSearchQuery] = useState<string>('');
  
  // Iron configuration state
  const [ironConfigType, setIronConfigType] = useState<'set' | 'single'>('set');
  const [ironFrom, setIronFrom] = useState<string>('5');
  const [ironTo, setIronTo] = useState<string>('PW');
  const [ironSingle, setIronSingle] = useState<string>('3');
  
  // Double tap detection for mobile
  const [lastTap, setLastTap] = useState(0);
  const DOUBLE_TAP_DELAY = 300;
  
  // Swipe detection for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const minSwipeDistance = 50;
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // Category images for fallbacks
  const { categoryImages } = useCategoryImages(Object.values(STANDARD_CATEGORIES));

  // Reset state only when dialog is initially opened, not when closing
  useEffect(() => {
    if (isOpen) {
      // Dialog is opening, start fresh
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedBrand('');
    setBrands([]);
    setEquipment([]);
    setSelectedEquipment(null);
    setShafts([]);
    setSelectedShaft(null);
    setGrips([]);
    setSelectedGrip(null);
    setSelectedLoft('');
    setIronConfigType('set');
    setIronFrom('5');
    setIronTo('PW');
    setIronSingle('3');
    setSearchQuery('');
  };

  const handleCloseAttempt = () => {
    // Check if user has made any selections
    if (selectedCategory || selectedBrand || selectedEquipment || selectedShaft || selectedGrip || selectedLoft) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    resetState();
    onClose();
  };

  // Load brands when category is selected
  useEffect(() => {
    if (selectedCategory) {
      loadBrands(selectedCategory.value);
    }
  }, [selectedCategory]);

  const loadBrands = async (categoryValue: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('brand')
        .eq('category', categoryValue)
        .order('brand');

      if (data && !error) {
        const uniqueBrands = [...new Set(data.map(item => item.brand))].filter(Boolean);
        setBrands(uniqueBrands);
      }
    } catch (err) {
      console.error('Error loading brands:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load equipment when brand is selected
  const loadEquipment = async () => {
    if (!selectedCategory || !selectedBrand) {
      console.log('❌ Cannot load equipment - missing category or brand');
      return;
    }
    
    console.log('🔍 Loading equipment with photos:', { 
      category: selectedCategory.value, 
      brand: selectedBrand 
    });
    
    setLoading(true);
    try {
      // First get equipment with most liked photos
      const { data: equipmentWithPhotos, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          equipment_photos!left (
            photo_url,
            likes_count
          )
        `)
        .eq('brand', selectedBrand)
        .eq('category', selectedCategory.value)
        .order('model');

      if (equipmentError) {
        console.error('❌ Database error loading equipment:', equipmentError);
        setEquipment([]);
        return;
      }

      if (!equipmentWithPhotos) {
        console.log('⚪ No equipment found');
        setEquipment([]);
        return;
      }

      // Process equipment to get most liked photo for each
      const processedEquipment = equipmentWithPhotos.map(equipment => {
        const photos = equipment.equipment_photos || [];
        // Sort photos by likes and get the most liked one
        const mostLikedPhoto = photos
          .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
          .find(photo => photo.photo_url);

        return {
          ...equipment,
          most_liked_photo: mostLikedPhoto?.photo_url || null,
          equipment_photos: undefined // Remove the joined data to clean up the object
        };
      });

      console.log('✅ Loaded equipment with photos:', processedEquipment.length, 'items');
      console.log('📸 Items with photos:', processedEquipment.filter(e => e.most_liked_photo).length);
      
      setEquipment(processedEquipment);
    } catch (err) {
      console.error('❌ Error loading equipment:', err);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  // Load customization options
  const loadCustomizationOptions = async () => {
    if (!selectedEquipment || !selectedCategory) return;

    setLoading(true);
    try {
      // Load shafts from equipment table
      if (selectedCategory.hasShaft) {
        const { data: shaftData } = await supabase
          .from('equipment')
          .select('*')
          .eq('category', 'shaft')
          .order('brand')
          .order('model');
        
        if (shaftData) {
          setShafts(shaftData);
          // Auto-select stock shaft if available
          const stockShaft = shaftData.find(s => 
            s.brand.toLowerCase() === 'stock' || 
            (s.specs as any)?.is_stock === true
          );
          if (stockShaft) setSelectedShaft(stockShaft);
        }
      }

      // Load grips from equipment table
      if (selectedCategory.hasGrip) {
        const { data: gripData } = await supabase
          .from('equipment')
          .select('*')
          .eq('category', 'grip')
          .order('brand')
          .order('model');
        
        if (gripData) {
          setGrips(gripData);
          // Auto-select stock grip if available
          const stockGrip = gripData.find(g => 
            g.brand.toLowerCase() === 'stock' || 
            (g.specs as any)?.is_stock === true
          );
          if (stockGrip) setSelectedGrip(stockGrip);
        }
      }

      // Loft options are now handled in-component based on category
      // No database call needed
    } catch (err) {
      console.error('Error loading customization options:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load equipment when step changes to 'equipment' and we have category + brand
  useEffect(() => {
    if (step === 'equipment' && selectedCategory && selectedBrand) {
      console.log('🔄 Loading equipment for:', selectedCategory.value, selectedBrand);
      loadEquipment();
    }
  }, [step, selectedCategory, selectedBrand]);

  useEffect(() => {
    if (selectedEquipment) {
      loadCustomizationOptions();
    }
  }, [selectedEquipment]);

  const handleCategorySelect = (category: typeof EQUIPMENT_CATEGORIES[0]) => {
    setSelectedCategory(category);
    setSelectedBrand('');
    setEquipment([]);
    setSelectedEquipment(null);
    setStep('brand');
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setEquipment([]); // Clear previous equipment
    setSelectedEquipment(null);
    setStep('equipment');
  };

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    
    // Determine next step based on category
    if (!selectedCategory) return;
    
    // Check if this is an iron/irons category that needs configuration
    if (selectedCategory.value === 'iron' || equipment.category === 'iron' || 
        equipment.category === 'irons' || equipment.model.toLowerCase().includes('iron set')) {
      setStep('iron_config');
    } else if (selectedCategory.hasShaft) {
      setStep('shaft');
    } else {
      // For non-club equipment, go straight to completion
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (!selectedEquipment) return;

    const selection: any = {
      equipment_id: selectedEquipment.id,
    };

    if (selectedShaft) selection.shaft_id = selectedShaft.id;
    if (selectedGrip) selection.grip_id = selectedGrip.id;
    if (selectedLoft && selectedLoft !== 'none') {
      selection.loft = selectedLoft === 'standard' ? 'Standard' : selectedLoft;
    }
    
    // Add iron configuration if applicable
    if ((selectedCategory?.value === 'iron' || selectedEquipment.category === 'iron' || 
         selectedEquipment.category === 'irons') && step !== 'shaft') {
      selection.iron_config = {
        type: ironConfigType,
        ...(ironConfigType === 'set' 
          ? { from: ironFrom, to: ironTo }
          : { single: ironSingle })
      };
    }

    onSelectEquipment(selection);
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 'category': return 'Select Equipment Type';
      case 'brand': return 'Select Brand';
      case 'equipment': return 'Select Model';
      case 'shaft': return 'Select Shaft';
      case 'grip': return 'Select Grip';
      case 'loft': return 'Select Loft';
      case 'iron_config': return 'Configure Iron Set';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'shaft': return true; // Allow proceeding without selection (no preference)
      case 'grip': return true; // Allow proceeding without selection (no preference)
      case 'loft': return !selectedCategory?.hasLoft || selectedLoft !== '';
      case 'iron_config': return ironConfigType === 'single' || (ironFrom && ironTo && getIronIndex(ironFrom) <= getIronIndex(ironTo));
      default: return true;
    }
  };

  // Handle double tap for mobile
  const handleDoubleTap = (callback: () => void) => {
    const now = Date.now();
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      callback();
    }
    setLastTap(now);
  };
  
  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isRightSwipe) {
      // Navigate back
      switch (step) {
        case 'brand': 
          setStep('category');
          setSelectedCategory(null);
          setSelectedBrand('');
          setEquipment([]);
          break;
        case 'equipment': 
          setStep('brand');
          setSelectedBrand('');
          setEquipment([]);
          setSelectedEquipment(null);
          break;
        case 'shaft': 
          setStep('equipment');
          setSelectedEquipment(null);
          break;
        case 'grip': 
          setStep('shaft');
          setSelectedShaft(null);
          break;
        case 'loft': 
          setStep('grip');
          setSelectedGrip(null);
          break;
      }
    } else if (isLeftSwipe && canProceed()) {
      // Navigate forward
      switch (step) {
        case 'shaft':
          if (selectedCategory?.hasGrip) {
            setStep('grip');
          } else if (selectedCategory?.hasLoft) {
            setStep('loft');
          } else {
            handleComplete();
          }
          break;
        case 'grip':
          if (selectedCategory?.hasLoft) {
            setStep('loft');
          } else {
            handleComplete();
          }
          break;
        case 'loft':
          handleComplete();
          break;
      }
    }
  };

  return (
    <>
    {/* Equipment selection modal */}
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleCloseAttempt();
        }
      }}
      modal={true}
    >
      <DialogContent 
        className="flex flex-col bg-[#1a1a1a] sm:glass-card border-white/20 text-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDownOutside={(e) => {
          // Allow backdrop clicks to trigger close attempt
          handleCloseAttempt();
        }}
        onInteractOutside={(e) => {
          // Allow interaction outside to trigger close attempt
          handleCloseAttempt();
        }}
        onEscapeKeyDown={(e) => {
          // Allow escape key to trigger close attempt
          handleCloseAttempt();
        }}
      >
        <DialogHeader className="flex-shrink-0 sticky top-0 bg-[#1a1a1a] z-10 border-b border-white/10 p-4 sm:p-6 sm:pb-4 sm:border-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl sm:text-2xl">{getStepTitle()}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAttempt}
              className="h-10 w-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Progress breadcrumb - mobile-friendly navigation */}
        <div className="flex items-center flex-wrap gap-1 sm:gap-2 mx-4 sm:mx-0 mb-4 sm:mb-6 p-2 sm:p-3 bg-white/5 sm:backdrop-blur-sm rounded-lg border border-white/10">
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3 min-h-[32px] sm:min-h-[40px] flex items-center"
            onClick={() => {
              setStep('category');
              setSelectedCategory(null);
              setSelectedBrand('');
              setEquipment([]);
              setSelectedEquipment(null);
            }}
          >
            Equipment Type
          </Badge>
          
          {selectedCategory && (
            <>
              <ChevronRight className="w-4 h-4 text-white/50" />
              <Badge 
                variant="outline" 
                className="bg-primary/20 text-white border-primary/40 hover:bg-primary/30 cursor-pointer transition-colors text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3 min-h-[32px] sm:min-h-[40px] flex items-center"
                onClick={() => {
                  setStep('brand');
                  setSelectedBrand('');
                  setEquipment([]);
                  setSelectedEquipment(null);
                }}
              >
                {selectedCategory.label}
              </Badge>
            </>
          )}
          
          {selectedBrand && (
            <>
              <ChevronRight className="w-4 h-4 text-white/50" />
              <Badge 
                variant="outline" 
                className="bg-primary/20 text-white border-primary/40 hover:bg-primary/30 cursor-pointer transition-colors text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3 min-h-[32px] sm:min-h-[40px] flex items-center"
                onClick={() => {
                  setStep('equipment');
                  setEquipment([]);
                  setSelectedEquipment(null);
                }}
              >
                {selectedBrand}
              </Badge>
            </>
          )}
          
          {selectedEquipment && (
            <>
              <ChevronRight className="w-4 h-4 text-white/50" />
              <Badge 
                variant="default" 
                className="bg-primary text-white text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3 min-h-[32px] sm:min-h-[40px] flex items-center"
              >
                {selectedEquipment.model}
              </Badge>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
          {/* Category Selection */}
          {step === 'category' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EQUIPMENT_CATEGORIES.map((category) => (
                <CategoryTile
                  key={category.value}
                  category={category}
                  categoryImages={categoryImages}
                  onClick={() => handleCategorySelect(category)}
                />
              ))}
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

              {/* Submit New Equipment Button */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full glass-button flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Can't find your brand? Submit new equipment
                </Button>
              </div>

              {/* Popular brands */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-white/60 mb-2">Popular Brands</h3>
                <div className="flex flex-wrap gap-2">
                  {['TaylorMade', 'Callaway', 'Titleist', 'Ping', 'Cobra', 'Mizuno']
                    .filter(brand => brands.includes(brand))
                    .filter(brand => brand.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(brand => (
                      <Badge
                        key={brand}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => handleBrandSelect(brand)}
                      >
                        {brand}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* All brands */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">All Brands</h3>
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
              </div>
            </div>
          )}

          {/* Equipment Selection */}
          {step === 'equipment' && (
            <div className="space-y-3">
              {/* Mobile tip */}
              <div className="sm:hidden bg-primary/10 border border-primary/30 rounded-lg p-2 text-xs text-white/70 text-center">
                💡 Tip: Double-tap to quickly select and continue
              </div>
              {/* Submit New Equipment Button */}
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmitModal(true)}
                  className="glass-button flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Can't find what you're looking for?
                </Button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent mx-auto" />
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Equipment Found</h3>
                  <p className="text-white/60 mb-4">
                    No {selectedCategory?.label.toLowerCase()} found for {selectedBrand}
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep('brand');
                        setSelectedBrand('');
                        setEquipment([]);
                      }}
                      className="glass-button"
                    >
                      Try Different Brand
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Submit New Equipment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep('category');
                        setSelectedCategory(null);
                        setSelectedBrand('');
                        setEquipment([]);
                      }}
                      className="glass-button"
                    >
                      Change Category
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {equipment.map((item) => (
                    <Card
                      key={item.id}
                      className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-colors"
                      onClick={() => handleEquipmentSelect(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white">{item.model}</h3>
                          <p className="text-sm text-white/60">{item.brand}</p>
                          {item.msrp && (
                            <p className="text-sm text-white/60">${item.msrp}</p>
                          )}
                        </div>
                        <EquipmentImage 
                          equipment={item}
                          categoryImages={categoryImages}
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shaft Selection */}
          {step === 'shaft' && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm text-white/60">Customizing</p>
                <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                <p className="text-xs text-white/40 mt-1 sm:hidden">Tap to select • Double-tap to continue</p>
              </div>

              {/* Search input for shafts */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={shaftSearchQuery}
                  onChange={(e) => setShaftSearchQuery(e.target.value)}
                  placeholder="Search shafts..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* No preference option */}
              <Card
                className={`glass-card p-4 cursor-pointer transition-colors border-2 border-dashed ${
                  selectedShaft === null && shafts.length > 0
                    ? 'border-white/30 bg-white/5' 
                    : 'border-white/10 hover:bg-white/10'
                }`}
                onClick={() => {
                  setSelectedShaft(null);
                  handleDoubleTap(() => {
                    if (selectedCategory?.hasGrip) {
                      setStep('grip');
                    } else if (selectedCategory?.hasLoft) {
                      setStep('loft');
                    } else {
                      handleComplete();
                    }
                  });
                }}
              >
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="font-medium text-white/70">
                      No Preference / Stock Shaft
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                      Use default or decide later
                    </p>
                  </div>
                </div>
              </Card>

              {shafts
                .filter(shaft => {
                  const query = shaftSearchQuery.toLowerCase();
                  return (
                    shaft.brand.toLowerCase().includes(query) ||
                    shaft.model.toLowerCase().includes(query) ||
                    (shaft.flex && shaft.flex.toLowerCase().includes(query))
                  );
                })
                .map((shaft) => (
                <Card
                  key={shaft.id}
                  className={`glass-card p-4 cursor-pointer transition-colors ${
                    selectedShaft?.id === shaft.id 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setSelectedShaft(shaft);
                    handleDoubleTap(() => {
                      if (selectedCategory?.hasGrip) {
                        setStep('grip');
                      } else if (selectedCategory?.hasLoft) {
                        setStep('loft');
                      } else {
                        handleComplete();
                      }
                    });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {shaft.brand} {shaft.model} - {shaft.flex}
                      </h3>
                      <p className="text-sm text-white/60">
                        {shaft.weight_grams}g • {shaft.launch_profile}/{shaft.spin_profile}
                      </p>
                      {shaft.is_stock && (
                        <Badge variant="secondary" className="mt-1">Stock Option</Badge>
                      )}
                    </div>
                    {shaft.price > 0 && (
                      <span className="text-white/60">+${shaft.price}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Grip Selection */}
          {step === 'grip' && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm text-white/60">Customizing</p>
                <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                {selectedShaft && (
                  <p className="text-sm text-white/60">{selectedShaft.brand} {selectedShaft.model}</p>
                )}
                <p className="text-xs text-white/40 mt-1 sm:hidden">Tap to select • Double-tap to continue</p>
              </div>

              {/* Search input for grips */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={gripSearchQuery}
                  onChange={(e) => setGripSearchQuery(e.target.value)}
                  placeholder="Search grips..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* No preference option */}
              <Card
                className={`glass-card p-4 cursor-pointer transition-colors border-2 border-dashed ${
                  selectedGrip === null && grips.length > 0
                    ? 'border-white/30 bg-white/5' 
                    : 'border-white/10 hover:bg-white/10'
                }`}
                onClick={() => {
                  setSelectedGrip(null);
                  handleDoubleTap(() => {
                    if (selectedCategory?.hasLoft) {
                      setStep('loft');
                    } else {
                      handleComplete();
                    }
                  });
                }}
              >
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="font-medium text-white/70">
                      No Preference / Stock Grip
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                      Use default or decide later
                    </p>
                  </div>
                </div>
              </Card>

              {grips
                .filter(grip => {
                  const query = gripSearchQuery.toLowerCase();
                  return (
                    grip.brand.toLowerCase().includes(query) ||
                    grip.model.toLowerCase().includes(query) ||
                    (grip.size && grip.size.toLowerCase().includes(query)) ||
                    (grip.material && grip.material.toLowerCase().includes(query))
                  );
                })
                .map((grip) => (
                <Card
                  key={grip.id}
                  className={`glass-card p-4 cursor-pointer transition-colors ${
                    selectedGrip?.id === grip.id 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setSelectedGrip(grip);
                    handleDoubleTap(() => {
                      if (selectedCategory?.hasLoft) {
                        setStep('loft');
                      } else {
                        handleComplete();
                      }
                    });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {grip.brand} {grip.model} - {grip.size}
                      </h3>
                      <p className="text-sm text-white/60">
                        {grip.material} • {grip.weight_grams}g
                      </p>
                      {grip.is_stock && (
                        <Badge variant="secondary" className="mt-1">Stock Option</Badge>
                      )}
                    </div>
                    {grip.price > 0 && (
                      <span className="text-white/60">+${grip.price}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Loft Selection */}
          {step === 'loft' && selectedCategory && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm text-white/60">Customizing</p>
                <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                <p className="text-xs text-white/40 mt-1 sm:hidden">Tap to select • Double-tap to continue</p>
              </div>

              <div className="mb-2">
                <p className="text-sm text-white/60 mb-2">Select Loft</p>
                <p className="text-xs text-white/40 mb-3">Choose the loft angle for your {selectedCategory.label.toLowerCase()}</p>
              </div>

              <Select
                value={selectedLoft}
                onValueChange={(value) => {
                  setSelectedLoft(value);
                }}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select loft angle" />
                </SelectTrigger>
                <SelectContent className="glass-card bg-[#1a1a1a] border-white/20 z-[102]">
                  <SelectItem 
                    value="standard"
                    className="text-white hover:bg-white/10"
                  >
                    Standard / Stock Loft
                  </SelectItem>
                  <SelectItem 
                    value="none"
                    className="text-white/50 hover:bg-white/10 italic"
                  >
                    No preference
                  </SelectItem>
                  {(LOFT_OPTIONS[selectedCategory.value] || []).map((loft) => (
                    <SelectItem 
                      key={loft} 
                      value={loft}
                      className="text-white hover:bg-white/10"
                    >
                      {loft}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Common loft guide */}
              {selectedCategory.value === 'driver' && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-white/60">
                  <p className="font-medium mb-1">Loft Guide:</p>
                  <p>• Lower loft (8-9°): Lower ball flight, more roll</p>
                  <p>• Standard loft (9.5-10.5°): Balanced trajectory</p>
                  <p>• Higher loft (11-12.5°): Higher ball flight, more carry</p>
                </div>
              )}
              {selectedCategory.value === 'wedge' && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-white/60">
                  <p className="font-medium mb-1">Common Wedge Lofts:</p>
                  <p>• Pitching Wedge: 46-48°</p>
                  <p>• Gap Wedge: 50-52°</p>
                  <p>• Sand Wedge: 54-58°</p>
                  <p>• Lob Wedge: 60-64°</p>
                </div>
              )}
            </div>
          )}

          {/* Iron Configuration */}
          {step === 'iron_config' && (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm text-white/60">Customizing</p>
                <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                <p className="text-xs text-white/40 mt-1">Configure your iron set or individual iron</p>
              </div>

              {/* Configuration Type Toggle */}
              <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
                <Button
                  variant={ironConfigType === 'set' ? 'default' : 'ghost'}
                  onClick={() => setIronConfigType('set')}
                  className="flex-1"
                >
                  Iron Set
                </Button>
                <Button
                  variant={ironConfigType === 'single' ? 'default' : 'ghost'}
                  onClick={() => setIronConfigType('single')}
                  className="flex-1"
                >
                  Single Iron
                </Button>
              </div>

              {ironConfigType === 'set' ? (
                <>
                  <div>
                    <Label className="text-white/60 mb-2 block">Set Configuration</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-white/40 mb-1 block">From (Lowest)</Label>
                        <Select
                          value={ironFrom}
                          onValueChange={(value) => {
                            setIronFrom(value);
                            // Ensure 'to' is not before 'from'
                            if (getIronIndex(value) > getIronIndex(ironTo)) {
                              setIronTo(value);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card bg-[#1a1a1a] border-white/20 z-[102]">
                            {IRON_OPTIONS.map((iron) => (
                              <SelectItem 
                                key={iron} 
                                value={iron}
                                className="text-white hover:bg-white/10"
                              >
                                {iron}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-white/40 mb-1 block">To (Highest)</Label>
                        <Select
                          value={ironTo}
                          onValueChange={(value) => {
                            setIronTo(value);
                            // Ensure 'from' is not after 'to'
                            if (getIronIndex(value) < getIronIndex(ironFrom)) {
                              setIronFrom(value);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card bg-[#1a1a1a] border-white/20 z-[102]">
                            {IRON_OPTIONS.map((iron) => (
                              <SelectItem 
                                key={iron} 
                                value={iron}
                                className="text-white hover:bg-white/10"
                                disabled={getIronIndex(iron) < getIronIndex(ironFrom)}
                              >
                                {iron}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                      Selected: {ironFrom}-{ironTo}
                    </p>
                  </div>

                  {/* Common set configurations guide */}
                  <div className="p-3 bg-white/5 rounded-lg text-xs text-white/60">
                    <p className="font-medium mb-1">Common Sets:</p>
                    <p>• Modern: 5-PW or 4-PW</p>
                    <p>• Traditional: 3-PW</p>
                    <p>• Short Set: 6-PW or 7-PW</p>
                    <p>• With Gap Wedge: 5-GW or 4-AW</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-white/60 mb-2 block">Select Individual Iron</Label>
                    <Select
                      value={ironSingle}
                      onValueChange={setIronSingle}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card bg-[#1a1a1a] border-white/20 z-[102]">
                        {IRON_OPTIONS.map((iron) => (
                          <SelectItem 
                            key={iron} 
                            value={iron}
                            className="text-white hover:bg-white/10"
                          >
                            {iron} iron
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Individual iron guide */}
                  <div className="p-3 bg-white/5 rounded-lg text-xs text-white/60">
                    <p className="font-medium mb-1">Individual Iron Uses:</p>
                    <p>• 1-2 iron: Driving irons for tee shots</p>
                    <p>• 3 iron: Utility iron for long approach</p>
                    <p>• 4 iron: Long game utility</p>
                    <p>• Single wedge: Specialty wedge</p>
                  </div>
                </>
              )}

              {/* Continue button */}
              <Button
                onClick={() => {
                  if (selectedCategory?.hasShaft) {
                    setStep('shaft');
                  } else {
                    handleComplete();
                  }
                }}
                disabled={!canProceed()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {selectedCategory?.hasShaft ? 'Continue to Shaft Selection' : 'Add to Bag'}
              </Button>
            </div>
          )}
        </div>

        {/* Mobile swipe hint */}
        {step !== 'category' && (
          <div className="flex justify-center items-center mt-4 pt-4 border-t border-white/10 text-white/40 text-sm md:hidden">
            <span>← Swipe to go back</span>
            {canProceed() && step !== 'loft' && (
              <span className="ml-4">Swipe to continue →</span>
            )}
          </div>
        )}
        
        {/* Action button for completion steps */}
        {(step === 'loft' || (step === 'equipment' && !selectedCategory?.hasShaft && 
          selectedCategory?.value !== 'iron' && selectedEquipment?.category !== 'iron' && 
          selectedEquipment?.category !== 'irons') || 
          (step === 'shaft' && !selectedCategory?.hasGrip && !selectedCategory?.hasLoft) ||
          (step === 'grip' && !selectedCategory?.hasLoft)) && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Add to Bag
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Submit Equipment Modal */}
    <SubmitEquipmentModal
      isOpen={showSubmitModal}
      onClose={() => setShowSubmitModal(false)}
      onSubmit={async (equipmentData) => {
        try {
          // Submit equipment using the community service
          const { submitEquipment } = await import('@/services/communityEquipment');
          const result = await submitEquipment({
            brand: equipmentData.brand,
            model: equipmentData.model,
            category: equipmentData.category,
            year: equipmentData.year,
            msrp: undefined, // Will be set from form if provided
            image_url: equipmentData.imageUrl,
            imageFile: equipmentData.imageFile
          });
          
          if (result.success && result.equipment) {
            toast.success('Equipment added successfully!');
            setShowSubmitModal(false);
            
            // Refresh equipment list to show the new item
            if (selectedCategory && selectedBrand === equipmentData.brand) {
              await loadEquipment();
            }
            
            // Auto-select and add the new equipment to bag
            if (result.equipment) {
              setSelectedEquipment(result.equipment);
              
              // If equipment doesn't need customization, add it directly
              if (!selectedCategory || !selectedCategory.hasShaft) {
                // Add directly to bag
                onSelectEquipment({
                  equipment_id: result.equipment.id
                });
                onClose();
                toast.success('Equipment added to your bag!');
              } else {
                // Move to customization steps
                setStep('shaft');
                loadCustomizationOptions();
              }
            }
          } else {
            toast.error(result.error || 'Equipment already exists');
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to add equipment');
        }
      }}
      initialCategory={selectedCategory?.value}
    />
    
    {/* Confirmation Dialog */}
    <Dialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
      <DialogContent className="w-full max-w-full sm:max-w-md bg-[#1a1a1a] sm:glass-card border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Discard Equipment Selection?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-white/80">
            You have unsaved equipment selections. Are you sure you want to close? Your progress will be lost.
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowCloseConfirmation(false)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Continue Selecting
          </Button>
          <Button
            onClick={handleConfirmClose}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Discard & Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
export default EquipmentSelectorImproved;
