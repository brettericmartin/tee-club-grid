import { useState, useEffect } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
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

// Equipment categories with metadata - matching actual database values
const EQUIPMENT_CATEGORIES = [
  { value: 'driver', label: 'Driver', icon: '🏌️', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'fairway_wood', label: 'Fairway Wood', icon: '🏌️', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'wood,woods', label: 'Woods', icon: '🏌️', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'hybrid', label: 'Hybrid', icon: '🏌️', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'utility_iron', label: 'Utility Iron', icon: '🏌️', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'iron,irons', label: 'Irons', icon: '⛳', hasShaft: true, hasGrip: true, hasLoft: false },
  { value: 'wedge,wedges', label: 'Wedges', icon: '⛳', hasShaft: true, hasGrip: true, hasLoft: true },
  { value: 'putter,putters', label: 'Putters', icon: '⛳', hasShaft: true, hasGrip: true, hasLoft: false },
  { value: 'ball,golf_ball', label: 'Golf Balls', icon: '🏐', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'bags', label: 'Golf Bags', icon: '🎒', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'gloves', label: 'Gloves', icon: '🧤', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'ball_marker', label: 'Ball Markers', icon: '🎯', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'tees', label: 'Tees', icon: '⛳', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'towels', label: 'Towels', icon: '🏷️', hasShaft: false, hasGrip: false, hasLoft: false },
  { value: 'speakers', label: 'Speakers', icon: '🔊', hasShaft: false, hasGrip: false, hasLoft: false },
];

export function EquipmentSelectorImproved({ isOpen, onClose, onSelectEquipment }: EquipmentSelectorImprovedProps) {
  // State management
  const [step, setStep] = useState<'category' | 'brand' | 'equipment' | 'shaft' | 'grip' | 'loft'>('category');
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
  const [loftOptions, setLoftOptions] = useState<LoftOption[]>([]);
  const [selectedLoft, setSelectedLoft] = useState<LoftOption | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
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
    setLoftOptions([]);
    setSelectedLoft(null);
    setSearchQuery('');
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
      // Handle categories that might have multiple values (e.g., "iron,irons")
      const categories = categoryValue.split(',');
      
      let query = supabase
        .from('equipment')
        .select('brand');
      
      if (categories.length > 1) {
        query = query.in('category', categories);
      } else {
        query = query.eq('category', categoryValue);
      }
      
      const { data, error } = await query.order('brand');

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
    if (!selectedCategory || !selectedBrand) return;
    
    setLoading(true);
    try {
      // Handle categories that might have multiple values
      const categories = selectedCategory.value.split(',');
      
      let query = supabase
        .from('equipment')
        .select('*')
        .eq('brand', selectedBrand);
      
      if (categories.length > 1) {
        query = query.in('category', categories);
      } else {
        query = query.eq('category', selectedCategory.value);
      }
      
      const { data, error } = await query.order('model');

      if (data && !error) {
        setEquipment(data);
      }
    } catch (err) {
      console.error('Error loading equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load customization options
  const loadCustomizationOptions = async () => {
    if (!selectedEquipment || !selectedCategory) return;

    setLoading(true);
    try {
      // Load shafts if applicable
      if (selectedCategory.hasShaft) {
        const { data: shaftData } = await supabase
          .from('shafts')
          .select('*')
          .eq('category', selectedCategory.value)
          .order('is_stock', { ascending: false })
          .order('brand');
        
        if (shaftData) {
          setShafts(shaftData);
          // Auto-select stock shaft
          const stockShaft = shaftData.find(s => s.is_stock);
          if (stockShaft) setSelectedShaft(stockShaft);
        }
      }

      // Load grips if applicable
      if (selectedCategory.hasGrip) {
        const { data: gripData } = await supabase
          .from('grips')
          .select('*')
          .order('is_stock', { ascending: false })
          .order('brand');
        
        if (gripData) {
          setGrips(gripData);
          // Auto-select stock grip
          const stockGrip = gripData.find(g => g.is_stock);
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

  useEffect(() => {
    if (selectedEquipment) {
      loadCustomizationOptions();
    }
  }, [selectedEquipment]);

  const handleCategorySelect = (category: typeof EQUIPMENT_CATEGORIES[0]) => {
    setSelectedCategory(category);
    setStep('brand');
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setStep('equipment');
    loadEquipment();
  };

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    
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
      default: return '';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'shaft': return !!selectedShaft;
      case 'grip': return !!selectedGrip;
      case 'loft': return !selectedCategory?.hasLoft || !!selectedLoft;
      default: return true;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/20 text-white max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {/* Progress breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
          {selectedCategory && (
            <>
              <span className="text-white">{selectedCategory.label}</span>
              {selectedBrand && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-white">{selectedBrand}</span>
                </>
              )}
              {selectedEquipment && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-white">{selectedEquipment.model}</span>
                </>
              )}
            </>
          )}
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {/* Category Selection */}
          {step === 'category' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EQUIPMENT_CATEGORIES.map((category) => (
                <Card
                  key={category.value}
                  className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-all group"
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <div className="font-medium text-white group-hover:text-primary transition-colors">
                      {category.label}
                    </div>
                  </div>
                </Card>
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
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent mx-auto" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {equipment.map((item) => (
                    <Card
                      key={item.id}
                      className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-all"
                      onClick={() => handleEquipmentSelect(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{item.model}</h3>
                          <p className="text-sm text-white/60">{item.brand}</p>
                          {item.msrp && (
                            <p className="text-sm text-white/60">${item.msrp}</p>
                          )}
                        </div>
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.model}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
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
              </div>

              {shafts.map((shaft) => (
                <Card
                  key={shaft.id}
                  className={`glass-card p-4 cursor-pointer transition-all ${
                    selectedShaft?.id === shaft.id 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => setSelectedShaft(shaft)}
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
                <p className="text-sm text-white/60">{selectedShaft?.brand} {selectedShaft?.model}</p>
              </div>

              {grips.map((grip) => (
                <Card
                  key={grip.id}
                  className={`glass-card p-4 cursor-pointer transition-all ${
                    selectedGrip?.id === grip.id 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => setSelectedGrip(grip)}
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
                <p className="text-sm text-white/60">Customizing</p>
                <p className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</p>
              </div>

              <Select
                value={selectedLoft?.id}
                onValueChange={(value) => {
                  const loft = loftOptions.find(l => l.id === value);
                  setSelectedLoft(loft || null);
                }}
              >
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue placeholder="Select loft" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {loftOptions.map((loft) => (
                    <SelectItem key={loft.id} value={loft.id}>
                      {loft.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => {
              switch (step) {
                case 'brand': setStep('category'); break;
                case 'equipment': setStep('brand'); break;
                case 'shaft': setStep('equipment'); break;
                case 'grip': setStep('shaft'); break;
                case 'loft': setStep('grip'); break;
              }
            }}
            disabled={step === 'category'}
            className="text-white/60 hover:text-white"
          >
            Back
          </Button>

          <Button
            onClick={() => {
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
            }}
            disabled={!canProceed()}
            className="bg-primary hover:bg-primary/90"
          >
            {step === 'loft' || (!selectedCategory?.hasShaft && step === 'equipment') ? 'Add to Bag' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}