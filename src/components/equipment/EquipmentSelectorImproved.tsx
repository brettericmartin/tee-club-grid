import { useState, useEffect } from 'react';
import { Search, ChevronRight, X, Plus, RotateCcw, Save, Camera, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { EQUIPMENT_CATEGORIES as STANDARD_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import { getBestEquipmentPhoto } from '@/services/unifiedPhotoService';
import { getEquipmentVariants } from '@/services/bags';
import SubmitEquipmentModal from '@/components/SubmitEquipmentModal';
import { CommunityPhotosGallery } from '@/components/bag/CommunityPhotosGallery';
import { toast } from 'sonner';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useAuth } from '@/contexts/AuthContext';

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  most_liked_photo?: string;
};
type Shaft = Database['public']['Tables']['shafts']['Row'];
type Grip = Database['public']['Tables']['grips']['Row'];
type LoftOption = Database['public']['Tables']['loft_options']['Row'];

interface EquipmentSelectorImprovedProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment: (equipment: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft_option_id?: string;
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
  
  // Use unified photo service for consistent photo selection
  const getImageSrc = () => {
    if (imageError) return null;
    
    // Get best photo using unified service
    const bestPhoto = getBestEquipmentPhoto(equipment);
    if (bestPhoto) return bestPhoto;
    
    // Fallback to category-level most liked photo
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

interface FormState {
  step: 'category' | 'brand' | 'equipment' | 'shaft' | 'grip' | 'loft';
  selectedCategory: typeof EQUIPMENT_CATEGORIES[0] | null;
  selectedBrand: string;
  brands: string[];
  equipment: Equipment[];
  selectedEquipment: Equipment | null;
  shafts: Shaft[];
  selectedShaft: Shaft | null;
  grips: Grip[];
  selectedGrip: Grip | null;
  loftOptions: LoftOption[];
  selectedLoft: LoftOption | null;
  searchQuery: string;
}

const initialFormState: FormState = {
  step: 'category',
  selectedCategory: null,
  selectedBrand: '',
  brands: [],
  equipment: [],
  selectedEquipment: null,
  shafts: [],
  selectedShaft: null,
  grips: [],
  selectedGrip: null,
  loftOptions: [],
  selectedLoft: null,
  searchQuery: ''
};

export function EquipmentSelectorImproved({ isOpen, onClose, onSelectEquipment }: EquipmentSelectorImprovedProps) {
  const { user } = useAuth();
  
  // Use form persistence hook
  const {
    state: formState,
    setState: setFormState,
    persistState,
    clearPersistedData,
    handleSuccess,
    hasPersistedData,
    isLoading: isPersistenceLoading
  } = useFormPersistence<FormState>(initialFormState, {
    key: 'equipment-selector-form',
    expirationMinutes: 30,
    clearOnSuccess: true
  });

  // Extract individual state values for easier access
  const { 
    step, selectedCategory, selectedBrand, brands, equipment, 
    selectedEquipment, shafts, selectedShaft, grips, selectedGrip, 
    loftOptions, selectedLoft, searchQuery 
  } = formState;

  // State setters that update the persisted state
  const setStep = (value: FormState['step']) => setFormState(prev => ({ ...prev, step: value }));
  const setSelectedCategory = (value: FormState['selectedCategory']) => setFormState(prev => ({ ...prev, selectedCategory: value }));
  const setSelectedBrand = (value: FormState['selectedBrand']) => setFormState(prev => ({ ...prev, selectedBrand: value }));
  const setBrands = (value: FormState['brands']) => setFormState(prev => ({ ...prev, brands: value }));
  const setEquipment = (value: FormState['equipment']) => setFormState(prev => ({ ...prev, equipment: value }));
  const setSelectedEquipment = (value: FormState['selectedEquipment']) => setFormState(prev => ({ ...prev, selectedEquipment: value }));
  const setShafts = (value: FormState['shafts']) => setFormState(prev => ({ ...prev, shafts: value }));
  const setSelectedShaft = (value: FormState['selectedShaft']) => setFormState(prev => ({ ...prev, selectedShaft: value }));
  const setGrips = (value: FormState['grips']) => setFormState(prev => ({ ...prev, grips: value }));
  const setSelectedGrip = (value: FormState['selectedGrip']) => setFormState(prev => ({ ...prev, selectedGrip: value }));
  const setLoftOptions = (value: FormState['loftOptions']) => setFormState(prev => ({ ...prev, loftOptions: value }));
  const setSelectedLoft = (value: FormState['selectedLoft']) => setFormState(prev => ({ ...prev, selectedLoft: value }));
  const setSearchQuery = (value: FormState['searchQuery']) => setFormState(prev => ({ ...prev, searchQuery: value }));
  
  // Other state not persisted
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedCustomPhoto, setSelectedCustomPhoto] = useState<string | null>(null);
  const [shaftSearch, setShaftSearch] = useState('');
  const [gripSearch, setGripSearch] = useState('');
  const [customLoft, setCustomLoft] = useState('');
  const [showCustomLoft, setShowCustomLoft] = useState(false);
  const [existingVariants, setExistingVariants] = useState<any[]>([]);
  
  // Double tap detection for mobile
  const [lastTap, setLastTap] = useState(0);
  const DOUBLE_TAP_DELAY = 300;
  
  // Swipe detection for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const minSwipeDistance = 50;
  
  // Category images for fallbacks
  const { categoryImages } = useCategoryImages(Object.values(STANDARD_CATEGORIES));
  
  // Loft options by equipment category
  const LOFT_OPTIONS: Record<string, string[]> = {
    driver: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'],
    fairway_wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    hybrid: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'],
    wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
  };

  // Don't reset state when dialog closes - persist it instead
  useEffect(() => {
    if (!isOpen && formState !== initialFormState) {
      // Save state when closing
      persistState();
    }
  }, [isOpen]);

  const resetState = () => {
    clearPersistedData();
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

      // Load loft options if applicable
      if (selectedCategory.hasLoft) {
        const { data: loftData } = await supabase
          .from('loft_options')
          .select('*')
          .eq('equipment_category', selectedCategory.value)
          .order('sort_order');
        
        if (loftData) {
          setLoftOptions(loftData);
        }
      }
    } catch (err) {
      console.error('Error loading customization options:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load existing variants for all equipment in user's bag on component mount
  const loadAllVariants = async () => {
    if (!user) return;
    
    try {
      // Get user's current bag
      const { data: bagData } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      if (!bagData) return;
      
      // Get all equipment in the bag
      const { data: bagEquipment } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment:equipment_id (*),
          shaft:shaft_id (*),
          grip:grip_id (*)
        `)
        .eq('bag_id', bagData.id);
      
      if (bagEquipment) {
        setExistingVariants(bagEquipment);
      }
    } catch (error) {
      console.error('Error loading existing equipment:', error);
    }
  };

  // Load existing variants on mount
  useEffect(() => {
    if (isOpen && user) {
      loadAllVariants();
    }
  }, [isOpen, user]);

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

  // Check for existing variants of this equipment in user's bag
  const checkForVariants = async (equipmentId: string) => {
    if (!user) return;
    
    try {
      // Get user's current bag
      const { data: bagData } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      if (!bagData) return;
      
      // Get variants of this equipment
      const variants = await getEquipmentVariants(bagData.id, equipmentId);
      setExistingVariants(variants);
      
      if (variants.length > 0) {
        // Show info about existing variants
        const variantInfo = variants.map(v => {
          const specs = [];
          if (v.custom_specs?.loft) specs.push(v.custom_specs.loft);
          if (v.shaft?.model) specs.push(v.shaft.model);
          return specs.length > 0 ? specs.join(', ') : 'Standard configuration';
        }).join(' | ');
        
        toast.info(`You have ${variants.length} of these in your bag: ${variantInfo}`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error checking for variants:', error);
    }
  };

  const handleEquipmentSelect = async (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    
    // Check for existing variants
    await checkForVariants(equipment.id);
    
    // Determine next step based on category
    if (!selectedCategory) return;
    
    if (selectedCategory.hasShaft) {
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
    if (selectedLoft) selection.loft_option_id = selectedLoft.id;
    
    // Add custom loft if provided
    if (customLoft && customLoft !== 'none') {
      selection.custom_loft = customLoft;
    }
    
    // Add custom photo if selected
    if (selectedCustomPhoto) {
      selection.custom_photo_url = selectedCustomPhoto;
    }

    onSelectEquipment(selection);
    handleSuccess(); // Clear persisted data on success
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
      default: return '';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'shaft': return selectedShaft !== undefined; // Allow null for Default/Stock
      case 'grip': return selectedGrip !== undefined; // Allow null for Default/Stock
      case 'loft': return !selectedCategory?.hasLoft || !!customLoft || !!selectedLoft;
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Save state when closing instead of resetting
        persistState();
        onClose();
      }
    }}>
      <DialogContent 
        className="glass-card border-white/20 text-white max-w-3xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-2xl truncate">{getStepTitle()}</DialogTitle>
              {hasPersistedData && !isPersistenceLoading && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 hidden sm:flex">
                  <Save className="w-3 h-3 mr-1" />
                  Draft Saved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {hasPersistedData && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    resetState();
                    toast.success('Form cleared');
                  }}
                  className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10"
                  title="Clear form"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  persistState();
                  onClose();
                }}
                className="text-white hover:bg-white/10 h-10 w-10"
                title="Save and close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progress breadcrumb - mobile-friendly navigation */}
        <div className="flex items-center flex-wrap gap-2 mb-4 p-2 sm:p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 shrink-0">
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors text-sm py-2 px-3 min-h-[40px] flex items-center"
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
                className="bg-primary/20 text-white border-primary/40 hover:bg-primary/30 cursor-pointer transition-colors text-sm py-2 px-3 min-h-[40px] flex items-center"
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
                className="bg-primary/20 text-white border-primary/40 hover:bg-primary/30 cursor-pointer transition-colors text-sm py-2 px-3 min-h-[40px] flex items-center"
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
                className="bg-primary text-white text-sm py-2 px-3 min-h-[40px] flex items-center"
              >
                {selectedEquipment.model}
              </Badge>
            </>
          )}
        </div>

        <ScrollArea className="flex-1 overflow-y-auto min-h-0">
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
                  {equipment.map((item) => {
                    // Check if this equipment has variants in the bag
                    const hasVariants = existingVariants.some(v => v.equipment_id === item.id);
                    const variantCount = existingVariants.filter(v => v.equipment_id === item.id).length;
                    
                    return (
                      <Card
                        key={item.id}
                        className={`glass-card p-4 cursor-pointer hover:bg-white/20 transition-colors ${
                          selectedEquipment?.id === item.id ? 'ring-2 ring-primary bg-primary/10' : ''
                        }`}
                        onClick={() => handleEquipmentSelect(item)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white">{item.model}</h3>
                                <p className="text-sm text-white/60">{item.brand}</p>
                                {item.msrp && (
                                  <p className="text-sm text-white/60">${item.msrp}</p>
                                )}
                              </div>
                              {hasVariants && (
                                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                  <Copy className="w-3 h-3 mr-1" />
                                  {variantCount} in bag
                                </Badge>
                              )}
                            </div>
                          </div>
                          <EquipmentImage 
                            equipment={item}
                            categoryImages={categoryImages}
                            className="w-20 h-20 object-cover rounded flex-shrink-0"
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Shaft Selection */}
          {step === 'shaft' && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Customizing</p>
                    <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                    <p className="text-xs text-white/40 mt-1 sm:hidden">Tap to select • Double-tap to continue</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPhotoGallery(true)}
                    className="glass-button"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {selectedCustomPhoto ? 'Change Photo' : 'Select Photo'}
                  </Button>
                </div>
              </div>

              {/* Search input for shafts */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                <Input
                  placeholder="Search shafts by brand, model, or flex..."
                  value={shaftSearch}
                  onChange={(e) => setShaftSearch(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* Default/Stock Shaft Option */}
              {(!shaftSearch || 'default stock shaft'.includes(shaftSearch.toLowerCase())) && (
                <Card
                  className={`glass-card p-4 cursor-pointer transition-colors ${
                    selectedShaft === null 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setSelectedShaft(null);
                    setShaftSearch('');
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
                      <p className="font-medium text-white">Default/Stock Shaft</p>
                      <p className="text-sm text-white/60">Use manufacturer's stock shaft</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40" />
                  </div>
                </Card>
              )}

              {/* Filtered shaft list */}
              {shafts
                .filter((shaft) => {
                  if (!shaftSearch) return true;
                  const searchText = `${shaft.brand} ${shaft.model} ${shaft.flex || ''} ${shaft.weight || ''}`.toLowerCase();
                  return searchText.includes(shaftSearch.toLowerCase());
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
                <p className="text-sm text-white/60">
                  {selectedShaft ? `${selectedShaft.brand} ${selectedShaft.model}` : 'Default/Stock Shaft'}
                </p>
              </div>

              {/* Search input for grips */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                <Input
                  placeholder="Search grips by brand, model, or size..."
                  value={gripSearch}
                  onChange={(e) => setGripSearch(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* Default/Stock Grip Option */}
              {(!gripSearch || 'default stock grip'.includes(gripSearch.toLowerCase())) && (
                <Card
                  className={`glass-card p-4 cursor-pointer transition-colors ${
                    selectedGrip === null 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setSelectedGrip(null);
                    setGripSearch('');
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
                      <p className="font-medium text-white">Default/Stock Grip</p>
                      <p className="text-sm text-white/60">Use manufacturer's stock grip</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40" />
                  </div>
                </Card>
              )}

              {/* Filtered grip list */}
              {grips
                .filter((grip) => {
                  if (!gripSearch) return true;
                  const searchText = `${grip.brand} ${grip.model} ${grip.size || ''} ${grip.material || ''}`.toLowerCase();
                  return searchText.includes(gripSearch.toLowerCase());
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
          {step === 'loft' && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Customizing</p>
                    <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
                    <p className="text-xs text-white/40 mt-1 sm:hidden">Tap to select • Double-tap to continue</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPhotoGallery(true)}
                    className="glass-button"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {selectedCustomPhoto ? 'Change Photo' : 'Select Photo'}
                  </Button>
                </div>
              </div>

              {/* Get loft options for this category */}
              {(() => {
                const categoryLoftOptions = selectedCategory?.value ? LOFT_OPTIONS[selectedCategory.value] : [];
                
                if (!categoryLoftOptions || categoryLoftOptions.length === 0) {
                  // Skip loft step if no options available
                  handleComplete();
                  return null;
                }

                return (
                  <>
                    {/* None/Default Option */}
                    <Card
                      className={`glass-card p-4 cursor-pointer transition-colors ${
                        !customLoft && !showCustomLoft
                          ? 'ring-2 ring-primary bg-primary/10' 
                          : 'hover:bg-white/20'
                      }`}
                      onClick={() => {
                        setCustomLoft('');
                        setShowCustomLoft(false);
                        handleDoubleTap(() => handleComplete());
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">None / Default</p>
                          <p className="text-sm text-white/60">Use standard loft</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-white/40" />
                      </div>
                    </Card>

                    {/* Preset Loft Options */}
                    {categoryLoftOptions.map((loft) => (
                      <Card
                        key={loft}
                        className={`glass-card p-4 cursor-pointer transition-colors ${
                          customLoft === loft && !showCustomLoft
                            ? 'ring-2 ring-primary bg-primary/10' 
                            : 'hover:bg-white/20'
                        }`}
                        onClick={() => {
                          setCustomLoft(loft);
                          setShowCustomLoft(false);
                          handleDoubleTap(() => handleComplete());
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{loft}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-white/40" />
                        </div>
                      </Card>
                    ))}

                    {/* Custom Loft Option */}
                    <Card
                      className={`glass-card p-4 cursor-pointer transition-colors ${
                        showCustomLoft
                          ? 'ring-2 ring-primary bg-primary/10' 
                          : 'hover:bg-white/20'
                      }`}
                      onClick={() => {
                        setShowCustomLoft(true);
                        if (!customLoft || categoryLoftOptions.includes(customLoft)) {
                          setCustomLoft('');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Custom Loft...
                          </p>
                          <p className="text-sm text-white/60">Enter your own loft value</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-white/40" />
                      </div>
                    </Card>

                    {/* Custom Loft Input */}
                    {showCustomLoft && (
                      <div className="p-4 bg-white/10 rounded-lg space-y-2">
                        <Input
                          type="text"
                          placeholder="Enter custom loft (e.g., 9.75°)"
                          value={customLoft}
                          onChange={(e) => setCustomLoft(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                          autoFocus
                        />
                        <p className="text-xs text-white/60">
                          Enter your custom loft value (include ° symbol if desired)
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </ScrollArea>

        {/* Bottom section - fixed at bottom on mobile */}
        <div className="shrink-0 mt-auto">
          {/* Mobile swipe hint */}
          {step !== 'category' && (
            <div className="flex justify-center items-center py-3 border-t border-white/10 text-white/40 text-sm md:hidden">
              <span>← Swipe to go back</span>
              {canProceed() && step !== 'loft' && (
                <span className="ml-4">Swipe to continue →</span>
              )}
            </div>
          )}
          
          {/* Action button for completion steps */}
          {(step === 'loft' || (step === 'equipment' && !selectedCategory?.hasShaft) || 
            (step === 'shaft' && !selectedCategory?.hasGrip && !selectedCategory?.hasLoft) ||
            (step === 'grip' && !selectedCategory?.hasLoft)) && (
            <div className="pt-3 pb-1 px-1 border-t border-white/10">
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="w-full bg-primary hover:bg-primary/90 h-12"
              >
                Add to Bag
              </Button>
            </div>
          )}
        </div>
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
                handleSuccess(); // Clear persisted data on success
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
    
    {selectedEquipment && (
      <CommunityPhotosGallery
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        equipmentId={selectedEquipment.id}
        onSelectPhoto={(photoUrl) => {
          setSelectedCustomPhoto(photoUrl);
          setShowPhotoGallery(false);
          toast.success('Photo selected for equipment');
        }}
      />
    )}
  </>
  );
}
export default EquipmentSelectorImproved;
