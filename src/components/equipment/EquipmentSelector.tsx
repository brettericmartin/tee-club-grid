import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, AlertCircle, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { debounce } from 'lodash';
import type { Database } from '@/lib/supabase';
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type Shaft = Database['public']['Tables']['equipment']['Row'];
type Grip = Database['public']['Tables']['equipment']['Row'];
type LoftOption = Database['public']['Tables']['loft_options']['Row'];

interface EquipmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment: (equipment: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft_option_id?: string;
  }) => void;
}

export function EquipmentSelector({ isOpen, onClose, onSelectEquipment }: EquipmentSelectorProps) {
  // Step management
  const [step, setStep] = useState<'equipment' | 'shaft' | 'grip' | 'loft'>('equipment');
  
  // Equipment selection
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentResults, setEquipmentResults] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [similarEquipment, setSimilarEquipment] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // New equipment form
  const [newEquipment, setNewEquipment] = useState({
    brand: '',
    model: '',
    category: '',
    msrp: '',
    description: ''
  });
  
  // Shaft selection
  const [shaftSearch, setShaftSearch] = useState('');
  const [shaftResults, setShaftResults] = useState<Shaft[]>([]);
  const [selectedShaft, setSelectedShaft] = useState<Shaft | null>(null);
  
  // Grip selection
  const [gripSearch, setGripSearch] = useState('');
  const [gripResults, setGripResults] = useState<Grip[]>([]);
  const [selectedGrip, setSelectedGrip] = useState<Grip | null>(null);
  
  // Loft selection
  const [loftOptions, setLoftOptions] = useState<LoftOption[]>([]);
  const [selectedLoft, setSelectedLoft] = useState<LoftOption | null>(null);

  // Equipment categories - using standardized values from single source
  const categories = Object.values(EQUIPMENT_CATEGORIES).map(category => ({
    value: category,
    label: CATEGORY_DISPLAY_NAMES[category]
  }));

  // Debounced search function
  const debouncedEquipmentSearch = useMemo(
    () => debounce(async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setEquipmentResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .or(`brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
          .order('times_used', { ascending: false })
          .limit(10);

        if (!error && data) {
          setEquipmentResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedEquipmentSearch(equipmentSearch);
  }, [equipmentSearch, debouncedEquipmentSearch]);

  // Check for duplicates before allowing new equipment
  const checkForDuplicates = async () => {
    if (newEquipment.brand.length < 3 || newEquipment.model.length < 2) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_equipment_exists', {
        input_brand: newEquipment.brand,
        input_model: newEquipment.model,
        input_category: newEquipment.category
      });

      if (!error && data) {
        const exactMatch = data.find((d: any) => d.match_type === 'exact');
        if (exactMatch) {
          alert('This equipment already exists in the database!');
          setShowAddEquipment(false);
          return;
        }

        const verySimilar = data.filter((d: any) => d.match_type === 'very_similar');
        if (verySimilar.length > 0) {
          setSimilarEquipment(verySimilar);
        }
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
    }
  };

  // Add new equipment
  const handleAddEquipment = async () => {
    // Validate
    if (newEquipment.brand.length < 3 || newEquipment.model.length < 2 || !newEquipment.category) {
      alert('Please fill in all required fields');
      return;
    }

    // Check for duplicates one more time
    await checkForDuplicates();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: newEquipment.brand.trim(),
          model: newEquipment.model.trim(),
          category: newEquipment.category,
          msrp: newEquipment.msrp ? parseFloat(newEquipment.msrp) : null,
          description: newEquipment.description.trim(),
          added_by_user_id: user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          alert('This equipment already exists!');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        setSelectedEquipment(data);
        setShowAddEquipment(false);
        setStep('shaft');
      }
    } catch (err) {
      console.error('Error adding equipment:', err);
      alert('Failed to add equipment');
    }
  };

  // Load shafts based on equipment category
  useEffect(() => {
    if (step === 'shaft' && selectedEquipment) {
      loadShafts(selectedEquipment.category);
    }
  }, [step, selectedEquipment]);

  const loadShafts = async (category: string) => {
    try {
      // Define shaft compatibility - which shaft categories work with which club types
      const shaftCompatibility: Record<string, string[]> = {
        'driver': ['driver', 'wood', 'fairway_wood'],
        'fairway_wood': ['driver', 'wood', 'fairway_wood', 'hybrid'],
        'hybrid': ['hybrid', 'fairway_wood', 'utility_iron'],
        'utility_iron': ['utility_iron', 'hybrid', 'iron'],
        'iron': ['iron', 'irons'],
        'irons': ['iron', 'irons'],
        'wedge': ['wedge', 'wedges'],
        'wedges': ['wedge', 'wedges'],
        'putter': ['putter', 'putters'],
        'putters': ['putter', 'putters']
      };

      // Get compatible shaft categories for the selected equipment
      const compatibleCategories = shaftCompatibility[category] || [category];
      
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'shaft')
        .order('brand', { ascending: true })
        .order('model', { ascending: true });

      if (data) {
        setShaftResults(data);
        // Auto-select first shaft if available
        if (data.length > 0) setSelectedShaft(data[0]);
      }
    } catch (err) {
      console.error('Error loading shafts:', err);
    }
  };

  // Load grips
  useEffect(() => {
    if (step === 'grip') {
      loadGrips();
    }
  }, [step]);

  const loadGrips = async () => {
    try {
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'grip')
        .order('brand', { ascending: true })
        .order('model', { ascending: true });

      if (data) {
        setGripResults(data);
        // Auto-select first grip if available
        if (data.length > 0) setSelectedGrip(data[0]);
      }
    } catch (err) {
      console.error('Error loading grips:', err);
    }
  };

  // Load loft options based on equipment category
  useEffect(() => {
    if (step === 'loft' && selectedEquipment) {
      loadLoftOptions(selectedEquipment.category);
    }
  }, [step, selectedEquipment]);

  const loadLoftOptions = async (category: string) => {
    try {
      const { data } = await supabase
        .from('loft_options')
        .select('*')
        .eq('equipment_category', category)
        .order('sort_order', { ascending: true });

      if (data) {
        setLoftOptions(data);
      }
    } catch (err) {
      console.error('Error loading loft options:', err);
    }
  };

  // Handle final selection
  const handleComplete = () => {
    if (!selectedEquipment) return;

    const needsLoft = ['driver', 'fairway_wood', 'hybrid', 'wedge', 'utility_iron'].includes(selectedEquipment.category);
    
    if (needsLoft && !selectedLoft) {
      alert('Please select a loft option');
      return;
    }

    onSelectEquipment({
      equipment_id: selectedEquipment.id,
      shaft_id: selectedShaft?.id,
      grip_id: selectedGrip?.id,
      loft_option_id: selectedLoft?.id
    });

    // Reset state
    resetState();
    onClose();
  };

  const resetState = () => {
    setStep('equipment');
    setEquipmentSearch('');
    setSelectedEquipment(null);
    setSelectedShaft(null);
    setSelectedGrip(null);
    setSelectedLoft(null);
    setNewEquipment({ brand: '', model: '', category: '', msrp: '', description: '' });
    setSimilarEquipment([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'equipment' && 'Select Equipment'}
            {step === 'shaft' && 'Select Shaft'}
            {step === 'grip' && 'Select Grip'}
            {step === 'loft' && 'Select Loft/Configuration'}
          </DialogTitle>
        </DialogHeader>

        {/* Equipment Selection Step */}
        {step === 'equipment' && !showAddEquipment && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment (e.g., 'TaylorMade Qi10')"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchLoading && (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent mx-auto" />
              </div>
            )}

            {equipmentResults.length > 0 && (
              <div className="space-y-2">
                {equipmentResults.map((equipment) => (
                  <div
                    key={equipment.id}
                    onClick={() => {
                      setSelectedEquipment(equipment);
                      setStep('shaft');
                    }}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{equipment.brand} {equipment.model}</div>
                    <div className="text-sm text-muted-foreground">
                      {equipment.category} • Used by {equipment.times_used || 0} golfers
                    </div>
                  </div>
                ))}
              </div>
            )}

            {equipmentSearch.length >= 3 && equipmentResults.length === 0 && !searchLoading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No equipment found</p>
                <Button onClick={() => setShowAddEquipment(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Equipment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Add New Equipment Form */}
        {showAddEquipment && (
          <div className="space-y-4">
            {similarEquipment.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Similar equipment found. Are you sure this is different?
                  <div className="mt-2 space-y-1">
                    {similarEquipment.map((eq) => (
                      <div key={eq.id} className="text-sm">
                        • {eq.brand} {eq.model}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Input
              placeholder="Brand (e.g., TaylorMade)"
              value={newEquipment.brand}
              onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })}
              onBlur={checkForDuplicates}
            />

            <Input
              placeholder="Model (e.g., Qi10 Max)"
              value={newEquipment.model}
              onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
              onBlur={checkForDuplicates}
            />

            <Select
              value={newEquipment.category}
              onValueChange={(value) => setNewEquipment({ ...newEquipment, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="MSRP (optional)"
              type="number"
              value={newEquipment.msrp}
              onChange={(e) => setNewEquipment({ ...newEquipment, msrp: e.target.value })}
            />

            <Input
              placeholder="Description (optional)"
              value={newEquipment.description}
              onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddEquipment(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddEquipment}
                disabled={newEquipment.brand.length < 3 || newEquipment.model.length < 2 || !newEquipment.category}
              >
                Add Equipment
              </Button>
            </div>
          </div>
        )}

        {/* Shaft Selection Step */}
        {step === 'shaft' && (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg">
              <div className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</div>
              <div className="text-sm text-muted-foreground">{selectedEquipment?.category}</div>
            </div>

            <div className="space-y-2">
              {shaftResults.map((shaft) => (
                <div
                  key={shaft.id}
                  onClick={() => setSelectedShaft(shaft)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedShaft?.id === shaft.id ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {shaft.brand} {shaft.model} {shaft.specs?.flex && `- ${shaft.specs.flex}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {shaft.specs?.weight && `${shaft.specs.weight}g`}
                        {shaft.specs?.launch_profile && ` • ${shaft.specs.launch_profile}/${shaft.specs.spin_profile || 'Med'}`}
                      </div>
                    </div>
                    {selectedShaft?.id === shaft.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('equipment')}>
                Back
              </Button>
              <Button onClick={() => setStep('grip')} disabled={!selectedShaft}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Grip Selection Step */}
        {step === 'grip' && (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg">
              <div className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</div>
              <div className="text-sm text-muted-foreground">
                {selectedShaft?.brand} {selectedShaft?.model} - {selectedShaft?.flex}
              </div>
            </div>

            <div className="space-y-2">
              {gripResults.map((grip) => (
                <div
                  key={grip.id}
                  onClick={() => setSelectedGrip(grip)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedGrip?.id === grip.id ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {grip.brand} {grip.model} {grip.specs?.size && `- ${grip.specs.size}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {grip.specs?.material && `${grip.specs.material}`}
                        {grip.specs?.weight && ` • ${grip.specs.weight}g`}
                      </div>
                    </div>
                    {selectedGrip?.id === grip.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('shaft')}>
                Back
              </Button>
              <Button 
                onClick={() => {
                  const needsLoft = ['driver', 'fairway_wood', 'hybrid', 'wedge', 'utility_iron'].includes(selectedEquipment?.category || '');
                  if (needsLoft) {
                    setStep('loft');
                  } else {
                    handleComplete();
                  }
                }} 
                disabled={!selectedGrip}
              >
                {['driver', 'fairway_wood', 'hybrid', 'wedge', 'utility_iron'].includes(selectedEquipment?.category || '') ? 'Next' : 'Add to Bag'}
              </Button>
            </div>
          </div>
        )}

        {/* Loft Selection Step */}
        {step === 'loft' && (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg">
              <div className="font-medium">{selectedEquipment?.brand} {selectedEquipment?.model}</div>
              <div className="text-sm text-muted-foreground">
                {selectedShaft?.brand} {selectedShaft?.model} • {selectedGrip?.brand} {selectedGrip?.model}
              </div>
            </div>

            <Select
              value={selectedLoft?.id}
              onValueChange={(value) => {
                const loft = loftOptions.find(l => l.id === value);
                setSelectedLoft(loft || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loft/configuration" />
              </SelectTrigger>
              <SelectContent>
                {loftOptions.map((loft) => (
                  <SelectItem key={loft.id} value={loft.id}>
                    {loft.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('grip')}>
                Back
              </Button>
              <Button onClick={handleComplete} disabled={!selectedLoft}>
                Add to Bag
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}