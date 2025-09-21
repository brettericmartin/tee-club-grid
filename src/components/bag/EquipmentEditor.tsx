import { useState, useEffect } from 'react';
import { Camera, Edit3, Star, StarOff, X, Images, Crop, Trash2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CommunityPhotosGallery } from './CommunityPhotosGallery';
import { ImageCropper } from '@/components/ImageCropper';
import { UnifiedPhotoUploadDialog } from '@/components/shared/UnifiedPhotoUploadDialog';
import { syncUserPhotoToEquipment } from '@/services/equipmentPhotoSync';
import type { Database } from '@/lib/supabase';

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['equipment']['Row'];
  grip?: Database['public']['Tables']['equipment']['Row'];
};

interface EquipmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: BagEquipmentItem;
  onUpdate: () => void;
}

export function EquipmentEditor({
  isOpen,
  onClose,
  equipment,
  onUpdate,
}: EquipmentEditorProps) {
  const [loading, setLoading] = useState(false);
  const [shafts, setShafts] = useState<Database['public']['Tables']['equipment']['Row'][]>([]);
  const [grips, setGrips] = useState<Database['public']['Tables']['equipment']['Row'][]>([]);
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  
  // Loft options by club type
  const LOFT_OPTIONS: Record<string, string[]> = {
    driver: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'],
    drivers: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'], // Plural alias
    fairway_wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    fairway_woods: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'], // Plural alias
    wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    woods: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    hybrid: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'],
    hybrids: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'], // Plural alias
    utility_iron: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°'], // Utility irons
    wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
    wedges: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
    putter: ['1°', '2°', '3°', '4°', '5°', '6°', '7°'], // Putter loft options
    putters: ['1°', '2°', '3°', '4°', '5°', '6°', '7°'] // Plural alias
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
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  // States for searchable dropdowns
  const [shaftOpen, setShaftOpen] = useState(false);
  const [gripOpen, setGripOpen] = useState(false);
  const [shaftSearch, setShaftSearch] = useState('');
  const [gripSearch, setGripSearch] = useState('');
  
  // States for add new shaft/grip
  const [showAddShaft, setShowAddShaft] = useState(false);
  const [showAddGrip, setShowAddGrip] = useState(false);
  const [newShaft, setNewShaft] = useState({ brand: '', model: '', flex: '', weight: '' });
  const [newGrip, setNewGrip] = useState({ brand: '', model: '', size: 'Standard', color: '' });
  const [showCustomLoft, setShowCustomLoft] = useState(false);
  
  // Check if equipment is a club (needs shaft/grip/loft options)
  const isClub = ['driver', 'drivers', 'fairway_wood', 'fairway_woods', 'wood', 'woods', 'hybrid', 'hybrids', 'utility_iron', 
                  'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters'].includes(equipment.equipment.category);
  
  // Check if equipment is an iron that needs configuration
  const isIron = ['iron', 'irons'].includes(equipment.equipment.category) || 
                 equipment.equipment.model.toLowerCase().includes('iron set');
  
  const [formData, setFormData] = useState({
    shaft_id: equipment.shaft_id || '',
    grip_id: equipment.grip_id || '',
    loft: equipment.custom_specs?.loft || '',
    iron_config_type: equipment.custom_specs?.iron_config?.type || 'set',
    iron_from: equipment.custom_specs?.iron_config?.from || '5',
    iron_to: equipment.custom_specs?.iron_config?.to || 'PW',
    iron_single: equipment.custom_specs?.iron_config?.single || '3',
    purchase_price: equipment.purchase_price?.toString() || '',
    purchase_date: equipment.purchase_date || '',
    condition: equipment.condition || 'new',
    notes: equipment.notes || '',
    is_featured: equipment.is_featured || false,
    custom_photo_url: equipment.custom_photo_url || '',
  });

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      loadEquipmentPhotos();
    }
  }, [isOpen, equipment.equipment.category]);

  const loadEquipmentPhotos = async () => {
    try {
      const { data } = await supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', equipment.equipment_id)
        .order('created_at', { ascending: false });
      
      if (data) setEquipmentPhotos(data);
    } catch (error) {
      console.error('Error loading equipment photos:', error);
    }
  };

  const loadOptions = async () => {
    try {
      // Load shafts for this category
      const { data: shaftData } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'shaft')
        .order('brand')
        .order('model');
      
      if (shaftData) setShafts(shaftData);

      // Load grips
      const { data: gripData } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'grip')
        .order('brand')
        .order('model');
      
      if (gripData) setGrips(gripData);

      // Loft options are now handled in-component based on category
      // No database call needed
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Build custom specs object with loft and iron config if provided
      const customSpecs: any = equipment.custom_specs || {};
      if (formData.loft) {
        customSpecs.loft = formData.loft;
      } else {
        delete customSpecs.loft;
      }
      
      // Add iron configuration if applicable
      if (isIron) {
        customSpecs.iron_config = {
          type: formData.iron_config_type,
          ...(formData.iron_config_type === 'set' 
            ? { from: formData.iron_from, to: formData.iron_to }
            : { single: formData.iron_single })
        };
      }
      
      const updateData: any = {
        shaft_id: formData.shaft_id || null,
        grip_id: formData.grip_id || null,
        custom_specs: Object.keys(customSpecs).length > 0 ? customSpecs : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        purchase_date: formData.purchase_date || null,
        condition: formData.condition,
        notes: formData.notes || null,
        is_featured: formData.is_featured,
        custom_photo_url: formData.custom_photo_url || null,
      };

      const { error } = await supabase
        .from('bag_equipment')
        .update(updateData)
        .eq('id', equipment.id);

      if (error) throw error;

      // Sync custom photo to equipment_photos if it was updated
      if (formData.custom_photo_url && formData.custom_photo_url !== equipment.custom_photo_url) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const syncResult = await syncUserPhotoToEquipment(
              user.id,
              equipment.equipment_id,
              formData.custom_photo_url,
              `Custom photo of ${equipment.equipment.brand} ${equipment.equipment.model}`
            );
            if (!syncResult.success) {
              console.error('Failed to sync photo to equipment gallery:', syncResult.error);
              // Don't fail the whole update - photo sync is not critical
            }
          }
        } catch (syncError) {
          console.error('Error syncing photo to equipment gallery:', syncError);
          // Continue with success - the main update worked
        }
      }

      toast.success('Equipment updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${equipment.equipment.brand} ${equipment.equipment.model} from your bag?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .delete()
        .eq('id', equipment.id);

      if (error) throw error;

      toast.success('Equipment removed from bag');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error removing equipment:', error);
      toast.error('Failed to remove equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewShaft = async () => {
    if (!newShaft.brand || !newShaft.model || !newShaft.flex) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: newShaft.brand,
          model: newShaft.model,
          category: 'shaft',
          msrp: 0,
          specs: {
            flex: newShaft.flex,
            weight: newShaft.weight ? parseFloat(newShaft.weight) : null,
            compatible_with: equipment.equipment.category
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state and select it
      setShafts([...shafts, data]);
      setFormData({ ...formData, shaft_id: data.id });
      setShowAddShaft(false);
      setNewShaft({ brand: '', model: '', flex: '', weight: '' });
      toast.success('Shaft added successfully');
    } catch (error) {
      console.error('Error adding shaft:', error);
      toast.error('Failed to add shaft');
    }
  };

  const handleAddNewGrip = async () => {
    if (!newGrip.brand || !newGrip.model) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: newGrip.brand,
          model: newGrip.model,
          category: 'grip',
          msrp: 0,
          specs: {
            size: newGrip.size,
            color: newGrip.color || null
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state and select it
      setGrips([...grips, data]);
      setFormData({ ...formData, grip_id: data.id });
      setShowAddGrip(false);
      setNewGrip({ brand: '', model: '', size: 'Standard', color: '' });
      toast.success('Grip added successfully');
    } catch (error) {
      console.error('Error adding grip:', error);
      toast.error('Failed to add grip');
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-full sm:max-w-2xl h-[100vh] sm:h-auto max-h-[100vh] sm:max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 flex-shrink-0 border-b">
            <DialogTitle className="text-lg sm:text-xl">
              Edit {equipment.equipment.brand} {equipment.equipment.model}
            </DialogTitle>
          </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}>
          <div className="space-y-4 sm:space-y-6">
          {/* Photo Section */}
          <div className="space-y-4">
            <Label className="text-sm sm:text-base">Equipment Photo</Label>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-accent rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={formData.custom_photo_url || equipment.equipment.most_liked_photo || equipment.equipment.image_url }
                  alt={`${equipment.equipment.brand} ${equipment.equipment.model}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPhotoUpload(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Custom Photo
                </Button>
                {formData.custom_photo_url && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCropperImage(formData.custom_photo_url);
                        setShowCropper(true);
                        setPendingCropFile(null);
                      }}
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      Crop Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, custom_photo_url: '' })}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove Photo
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Community Photos and Equipment Page Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPhotoGallery(true)}
                className="flex-1"
              >
                <Images className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Browse Community </span>Photos {equipmentPhotos.length > 0 && `(${equipmentPhotos.length})`}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/equipment/${equipment.equipment_id}`, '_blank')}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">View </span>Equipment Page
              </Button>
            </div>
          </div>

          {/* Feature Toggle */}
          <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
            <div>
              <Label className="text-base">Featured Equipment</Label>
              <p className="text-sm text-muted-foreground">
                Featured equipment appears in your bag preview
              </p>
            </div>
            <Button
              variant={formData.is_featured ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
            >
              {formData.is_featured ? (
                <>
                  <Star className="w-4 h-4 sm:mr-2 fill-current" />
                  <span className="ml-1 sm:ml-0">Featured</span>
                </>
              ) : (
                <>
                  <StarOff className="w-4 h-4 sm:mr-2" />
                  <span className="ml-1 sm:ml-0 hidden sm:inline">Not </span><span className="ml-1 sm:ml-0">Featured</span>
                </>
              )}
            </Button>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Shaft Selection - Only show for clubs */}
            {isClub && (
              <div>
                <Label>Shaft</Label>
                <Popover open={shaftOpen} onOpenChange={setShaftOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={shaftOpen}
                      className="w-full justify-between"
                    >
                      {formData.shaft_id
                        ? shafts.find((shaft) => shaft.id === formData.shaft_id)?.brand + ' ' +
                          shafts.find((shaft) => shaft.id === formData.shaft_id)?.model + ' - ' +
                          shafts.find((shaft) => shaft.id === formData.shaft_id)?.flex
                        : "Default/Stock Shaft"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 max-h-[40vh] sm:max-h-[50vh]" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput 
                        placeholder="Search shafts by brand, model, or flex..." 
                        value={shaftSearch}
                        onValueChange={setShaftSearch}
                        className="h-9"
                      />
                      <CommandEmpty />
                      <CommandList className="max-h-[30vh] sm:max-h-[40vh] overflow-y-auto">
                        <CommandGroup>
                          {(() => {
                            // Always show Default/Stock option first if no search or if it matches
                            const showDefault = !shaftSearch || 'default stock shaft'.includes(shaftSearch.toLowerCase());
                            
                            // Filter shafts based on search
                            const filteredShafts = shafts.filter((shaft) => {
                              if (!shaftSearch) return true;
                              const searchableText = `${shaft.brand} ${shaft.model} ${shaft.specs?.flex || ''} ${shaft.specs?.weight || ''}`.toLowerCase();
                              return searchableText.includes(shaftSearch.toLowerCase());
                            });
                            
                            // Show empty state if no results and no default option
                            if (!showDefault && filteredShafts.length === 0) {
                              return (
                                <div className="p-4 text-sm text-center">
                                  <p className="mb-2">No shaft found matching "{shaftSearch}"</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShaftOpen(false);
                                      setShowAddShaft(true);
                                      setNewShaft({ ...newShaft, brand: shaftSearch.split(' ')[0] || '', model: shaftSearch });
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New Shaft
                                  </Button>
                                </div>
                              );
                            }
                            
                            // Build results array
                            return (
                              <>
                                {/* Default/Stock option */}
                                {showDefault && (
                                  <CommandItem
                                    value="default-stock-shaft"
                                    onSelect={() => {
                                      setFormData({ ...formData, shaft_id: null });
                                      setShaftOpen(false);
                                      setShaftSearch('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !formData.shaft_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">Default/Stock Shaft</div>
                                      <div className="text-sm text-muted-foreground">
                                        Use manufacturer's stock shaft
                                      </div>
                                    </div>
                                  </CommandItem>
                                )}
                                {/* Regular shaft options */}
                                {filteredShafts.map((shaft) => {
                              // Create a searchable string with all relevant shaft attributes
                              const searchableText = `${shaft.brand} ${shaft.model} ${shaft.specs?.flex || ''} ${shaft.specs?.weight || ''}`.toLowerCase();
                              
                              return (
                                <CommandItem
                                  key={shaft.id}
                                  value={searchableText}
                                  onSelect={() => {
                                    setFormData({ ...formData, shaft_id: shaft.id });
                                    setShaftOpen(false);
                                    setShaftSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.shaft_id === shaft.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {shaft.brand} {shaft.model} {shaft.specs?.flex && `- ${shaft.specs.flex}`}
                                    </div>
                                    {shaft.specs?.weight && (
                                      <div className="text-sm text-muted-foreground">
                                        {shaft.specs.weight}g
                                      </div>
                                    )}
                                  </div>
                                  {shaft.msrp > 0 && (
                                    <span className="text-sm text-muted-foreground">+${shaft.msrp}</span>
                                  )}
                                </CommandItem>
                              );
                            })}
                              </>
                            );
                          })()}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Grip Selection - Only show for clubs */}
            {isClub && (
              <div>
                <Label>Grip</Label>
                <Popover open={gripOpen} onOpenChange={setGripOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={gripOpen}
                      className="w-full justify-between"
                    >
                      {formData.grip_id
                        ? grips.find((grip) => grip.id === formData.grip_id)?.brand + ' ' +
                          grips.find((grip) => grip.id === formData.grip_id)?.model + ' - ' +
                          grips.find((grip) => grip.id === formData.grip_id)?.size
                        : "Default/Stock Grip"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 max-h-[40vh] sm:max-h-[50vh]" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput 
                        placeholder="Search grips by brand, model, or size..." 
                        value={gripSearch}
                        onValueChange={setGripSearch}
                        className="h-9"
                      />
                      <CommandEmpty />
                      <CommandList className="max-h-[30vh] sm:max-h-[40vh] overflow-y-auto">
                        <CommandGroup>
                          {(() => {
                            // Always show Default/Stock option first if no search or if it matches
                            const showDefault = !gripSearch || 'default stock grip'.includes(gripSearch.toLowerCase());
                            
                            // Filter grips based on search
                            const filteredGrips = grips.filter((grip) => {
                              if (!gripSearch) return true;
                              const searchableText = `${grip.brand} ${grip.model} ${grip.specs?.size || ''} ${grip.specs?.color || ''}`.toLowerCase();
                              return searchableText.includes(gripSearch.toLowerCase());
                            });
                            
                            // Show empty state if no results and no default option
                            if (!showDefault && filteredGrips.length === 0) {
                              return (
                                <div className="p-4 text-sm text-center">
                                  <p className="mb-2">No grip found matching "{gripSearch}"</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setGripOpen(false);
                                      setShowAddGrip(true);
                                      setNewGrip({ ...newGrip, brand: gripSearch.split(' ')[0] || '', model: gripSearch });
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New Grip
                                  </Button>
                                </div>
                              );
                            }
                            
                            // Build results array
                            return (
                              <>
                                {/* Default/Stock option */}
                                {showDefault && (
                                  <CommandItem
                                    value="default-stock-grip"
                                    onSelect={() => {
                                      setFormData({ ...formData, grip_id: null });
                                      setGripOpen(false);
                                      setGripSearch('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !formData.grip_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">Default/Stock Grip</div>
                                      <div className="text-sm text-muted-foreground">
                                        Use manufacturer's stock grip
                                      </div>
                                    </div>
                                  </CommandItem>
                                )}
                                {/* Regular grip options */}
                                {filteredGrips.map((grip) => {
                              // Create a searchable string with all relevant grip attributes
                              const searchableText = `${grip.brand} ${grip.model} ${grip.specs?.size || ''} ${grip.specs?.color || ''}`.toLowerCase();
                              
                              return (
                                <CommandItem
                                  key={grip.id}
                                  value={searchableText}
                                  onSelect={() => {
                                    setFormData({ ...formData, grip_id: grip.id });
                                    setGripOpen(false);
                                    setGripSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.grip_id === grip.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {grip.brand} {grip.model} {grip.specs?.size && `- ${grip.specs.size}`}
                                    </div>
                                    {grip.specs?.color && (
                                      <div className="text-sm text-muted-foreground">
                                        {grip.specs.color}
                                      </div>
                                    )}
                                  </div>
                                  {grip.msrp > 0 && (
                                    <span className="text-sm text-muted-foreground">+${grip.msrp}</span>
                                  )}
                                </CommandItem>
                              );
                            })}
                              </>
                            );
                          })()}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Loft Selection - Only show for clubs with loft options */}
            {isClub && (() => {
              // Get loft options for this category (check both singular and plural)
              const category = equipment.equipment.category;
              const categoryLoftOptions = LOFT_OPTIONS[category] || 
                                         LOFT_OPTIONS[category.replace(/s$/, '')] || // Remove trailing 's'
                                         null;
              
              // Debug logging
              console.log('[Loft Selector] Category:', category, 'Options:', categoryLoftOptions);
              
              if (!categoryLoftOptions || categoryLoftOptions.length === 0) return null;
              
              // Check if the current loft is a custom value (not in the predefined list)
              const isCustomLoft = formData.loft && 
                                  formData.loft !== 'none' && 
                                  !categoryLoftOptions.includes(formData.loft);
              
              return (
                <div>
                  <Label>Loft/Configuration</Label>
                  <Select
                    value={isCustomLoft || showCustomLoft ? 'custom' : (formData.loft || 'none')}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setShowCustomLoft(true);
                        // Clear the loft value when switching to custom
                        if (!isCustomLoft) {
                          setFormData({ ...formData, loft: '' });
                        }
                        return;
                      }
                      setShowCustomLoft(false);
                      setFormData({ ...formData, loft: value === 'none' ? '' : value });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select loft">
                        {formData.loft || 'Select loft'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto z-[9999]" position="popper" sideOffset={5}>
                      <SelectItem value="none">None</SelectItem>
                      {categoryLoftOptions.map((loft) => (
                        <SelectItem key={loft} value={loft}>
                          {loft}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="border-t">
                        <div className="flex items-center">
                          <Plus className="mr-2 h-4 w-4" />
                          Custom Loft...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Custom Loft Input - Show when custom is selected or current value is custom */}
                  {(isCustomLoft || showCustomLoft) && (
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder="Enter custom loft (e.g., 9.75°)"
                        value={formData.loft || ''}
                        onChange={(e) => setFormData({ ...formData, loft: e.target.value })}
                        className="w-full"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your custom loft value (include ° symbol if desired)
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Iron Configuration - Only show for iron sets */}
            {isIron && (
              <div className="space-y-3">
                <Label>Iron Configuration</Label>
                
                {/* Configuration Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.iron_config_type === 'set' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, iron_config_type: 'set' })}
                    className="flex-1"
                    size="sm"
                  >
                    Iron Set
                  </Button>
                  <Button
                    type="button"
                    variant={formData.iron_config_type === 'single' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, iron_config_type: 'single' })}
                    className="flex-1"
                    size="sm"
                  >
                    Single Iron
                  </Button>
                </div>

                {formData.iron_config_type === 'set' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Select
                        value={formData.iron_from}
                        onValueChange={(value) => {
                          setFormData({ ...formData, iron_from: value });
                          // Ensure 'to' is not before 'from'
                          if (getIronIndex(value) > getIronIndex(formData.iron_to)) {
                            setFormData({ ...formData, iron_from: value, iron_to: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IRON_OPTIONS.map((iron) => (
                            <SelectItem key={iron} value={iron}>
                              {iron}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Select
                        value={formData.iron_to}
                        onValueChange={(value) => setFormData({ ...formData, iron_to: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IRON_OPTIONS.map((iron) => (
                            <SelectItem 
                              key={iron} 
                              value={iron}
                              disabled={getIronIndex(iron) < getIronIndex(formData.iron_from)}
                            >
                              {iron}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Select
                      value={formData.iron_single}
                      onValueChange={(value) => setFormData({ ...formData, iron_single: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select iron" />
                      </SelectTrigger>
                      <SelectContent>
                        {IRON_OPTIONS.map((iron) => (
                          <SelectItem key={iron} value={iron}>
                            {iron} iron
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Condition */}
            <div>
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Purchase Price</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Any special notes about this equipment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          </div>
        </div>
        
        {/* Fixed Footer with Actions */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-background">
          <div className="flex justify-between gap-2">
            <Button 
              variant="destructive" 
              onClick={handleRemove} 
              disabled={loading}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Remove from Bag</span>
              <span className="sm:hidden">Remove</span>
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} size="sm">
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Community Photos Gallery */}
      <CommunityPhotosGallery
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        equipmentId={equipment.equipment_id}
        onSelectPhoto={(photoUrl) => {
          setFormData({ ...formData, custom_photo_url: photoUrl });
          toast.success('Photo selected');
        }}
      />

      {/* Image Cropper */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => {
          setShowCropper(false);
          setCropperImage('');
          setPendingCropFile(null);
        }}
        imageUrl={cropperImage}
        onCropComplete={async (croppedImageUrl, cropData) => {
          console.log('Crop complete called with:', { croppedImageUrl, cropData });
          try {
            if (pendingCropFile) {
              // Convert cropped blob URL to file for upload
              const response = await fetch(croppedImageUrl);
              const blob = await response.blob();
              console.log('Created blob:', blob);
              
              const croppedFile = new File([blob], pendingCropFile.name, { type: 'image/jpeg' });
              console.log('Created file:', croppedFile);
              
              // Upload the cropped file
              await handlePhotoUpload(croppedFile);
            } else {
              // For existing photos, we need to re-upload the cropped version
              const response = await fetch(croppedImageUrl);
              const blob = await response.blob();
              const fileName = `equipment-${equipment.equipment_id}-cropped-${Date.now()}.jpg`;
              const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
              
              // TODO: Integrate with unified photo upload
              // For now, just update the photo URL directly
              setFormData({ ...formData, custom_photo_url: croppedImageUrl });
            }
            
            setShowCropper(false);
            setCropperImage('');
            setPendingCropFile(null);
          } catch (error) {
            console.error('Error processing cropped image:', error);
            toast.error('Failed to process cropped image');
          }
        }}
        aspectRatio={1}
        title="Crop Equipment Photo"
      />

      {/* Unified Photo Upload Dialog */}
      <UnifiedPhotoUploadDialog
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onUploadComplete={(photoUrl) => {
          setFormData({ ...formData, custom_photo_url: photoUrl });
          loadEquipmentPhotos();
        }}
        context={{
          type: 'equipment',
          equipmentId: equipment.equipment_id,
          equipmentName: `${equipment.equipment.brand} ${equipment.equipment.model}`,
          bagId: equipment.bag_id,
          bagName: equipment.bag?.name
        }}
        initialCaption={`Check out my ${equipment.equipment.brand} ${equipment.equipment.model}!`}
      />
      
      {/* Add New Shaft Dialog */}
      <Dialog open={showAddShaft} onOpenChange={setShowAddShaft}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Shaft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shaft-brand">Brand *</Label>
              <Input
                id="shaft-brand"
                value={newShaft.brand}
                onChange={(e) => setNewShaft({ ...newShaft, brand: e.target.value })}
                placeholder="e.g., Fujikura"
              />
            </div>
            <div>
              <Label htmlFor="shaft-model">Model *</Label>
              <Input
                id="shaft-model"
                value={newShaft.model}
                onChange={(e) => setNewShaft({ ...newShaft, model: e.target.value })}
                placeholder="e.g., Ventus Blue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shaft-flex">Flex *</Label>
                <Select
                  value={newShaft.flex}
                  onValueChange={(value) => setNewShaft({ ...newShaft, flex: value })}
                >
                  <SelectTrigger id="shaft-flex">
                    <SelectValue placeholder="Select flex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Ladies</SelectItem>
                    <SelectItem value="A">Senior</SelectItem>
                    <SelectItem value="R">Regular</SelectItem>
                    <SelectItem value="S">Stiff</SelectItem>
                    <SelectItem value="X">X-Stiff</SelectItem>
                    <SelectItem value="TX">Tour X-Stiff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shaft-weight">Weight (grams)</Label>
                <Input
                  id="shaft-weight"
                  type="number"
                  value={newShaft.weight}
                  onChange={(e) => setNewShaft({ ...newShaft, weight: e.target.value })}
                  placeholder="e.g., 65"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddShaft(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNewShaft}>
                Add Shaft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add New Grip Dialog */}
      <Dialog open={showAddGrip} onOpenChange={setShowAddGrip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Grip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grip-brand">Brand *</Label>
              <Input
                id="grip-brand"
                value={newGrip.brand}
                onChange={(e) => setNewGrip({ ...newGrip, brand: e.target.value })}
                placeholder="e.g., Golf Pride"
              />
            </div>
            <div>
              <Label htmlFor="grip-model">Model *</Label>
              <Input
                id="grip-model"
                value={newGrip.model}
                onChange={(e) => setNewGrip({ ...newGrip, model: e.target.value })}
                placeholder="e.g., MCC Plus4"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grip-size">Size</Label>
                <Select
                  value={newGrip.size}
                  onValueChange={(value) => setNewGrip({ ...newGrip, size: value })}
                >
                  <SelectTrigger id="grip-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Undersize">Undersize</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Midsize">Midsize</SelectItem>
                    <SelectItem value="Jumbo">Jumbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grip-color">Color</Label>
                <Input
                  id="grip-color"
                  value={newGrip.color}
                  onChange={(e) => setNewGrip({ ...newGrip, color: e.target.value })}
                  placeholder="e.g., Black/Red"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddGrip(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNewGrip}>
                Add Grip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default EquipmentEditor;
