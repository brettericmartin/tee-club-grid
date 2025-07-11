import { useState, useEffect } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
}

interface EquipmentSelectorSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
}

// Equipment categories - matching actual database values
const EQUIPMENT_CATEGORIES = [
  { value: 'driver', label: 'Driver', icon: '🏌️' },
  { value: 'fairway_wood', label: 'Fairway Wood', icon: '🏌️' },
  { value: 'hybrid', label: 'Hybrid', icon: '🏌️' },
  { value: 'utility_iron', label: 'Utility Iron', icon: '🏌️' },
  { value: 'iron,irons', label: 'Irons', icon: '⛳' },
  { value: 'wedge,wedges', label: 'Wedges', icon: '⛳' },
  { value: 'putter,putters', label: 'Putters', icon: '⛳' },
  { value: 'ball,golf_ball', label: 'Golf Balls', icon: '🏐' },
  { value: 'bags', label: 'Golf Bags', icon: '🎒' },
  { value: 'gloves', label: 'Gloves', icon: '🧤' },
  { value: 'ball_marker', label: 'Ball Markers', icon: '🎯' },
  { value: 'tees', label: 'Tees', icon: '⛳' },
  { value: 'towels', label: 'Towels', icon: '🏷️' },
  { value: 'speakers', label: 'Speakers', icon: '🔊' },
];

export function EquipmentSelectorSimple({ isOpen, onClose, onSelect }: EquipmentSelectorSimpleProps) {
  const [step, setStep] = useState<'category' | 'brand' | 'equipment'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Handle categories that might have multiple values (e.g., "iron,irons")
      const categories = selectedCategory.split(',');
      
      let query = supabase
        .from('equipment')
        .select('brand');
      
      if (categories.length > 1) {
        query = query.in('category', categories);
      } else {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query.order('brand');

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
      // Handle categories that might have multiple values
      const categories = selectedCategory.split(',');
      
      let query = supabase
        .from('equipment')
        .select('id, brand, model, category, image_url')
        .eq('brand', selectedBrand);
      
      if (categories.length > 1) {
        query = query.in('category', categories);
      } else {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query.order('model');

      if (error) throw error;
      setEquipment(data || []);
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
                  {EQUIPMENT_CATEGORIES.find(c => c.value === selectedCategory)?.label}
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
              {EQUIPMENT_CATEGORIES.map((category) => (
                <Card
                  key={category.value}
                  className="glass-card p-4 cursor-pointer hover:bg-white/20 transition-all group"
                  onClick={() => handleCategorySelect(category.value)}
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
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={`${item.brand} ${item.model}`}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
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