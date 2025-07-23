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
  loft_option?: Database['public']['Tables']['loft_options']['Row'];
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
  const [loftOptions, setLoftOptions] = useState<any[]>([]);
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
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
  
  // Check if equipment is a club (needs shaft/grip/loft options)
  const isClub = ['driver', 'fairway_wood', 'wood', 'woods', 'hybrid', 'utility_iron', 
                  'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters'].includes(equipment.equipment.category);
  
  const [formData, setFormData] = useState({
    shaft_id: equipment.shaft_id || '',
    grip_id: equipment.grip_id || '',
    loft_option_id: equipment.loft_option_id || '',
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

      // Load loft options if applicable
      if (['driver', 'fairway_wood', 'hybrid', 'wedge', 'utility_iron'].includes(equipment.equipment.category)) {
        const { data: loftData } = await supabase
          .from('loft_options')
          .select('*')
          .eq('equipment_category', equipment.equipment.category)
          .order('sort_order');
        
        if (loftData) setLoftOptions(loftData);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        shaft_id: formData.shaft_id || null,
        grip_id: formData.grip_id || null,
        loft_option_id: formData.loft_option_id || null,
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
        <DialogContent className="w-full max-w-full sm:max-w-2xl h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {equipment.equipment.brand} {equipment.equipment.model}
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* Photo Section */}
          <div className="space-y-4">
            <Label>Equipment Photo</Label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-accent rounded-lg overflow-hidden">
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
            
            {/* Community Photos Button */}
            <Button
              variant="outline"
              onClick={() => setShowPhotoGallery(true)}
              className="w-full"
            >
              <Images className="w-4 h-4 mr-2" />
              Browse Community Photos {equipmentPhotos.length > 0 && `(${equipmentPhotos.length})`}
            </Button>
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
                  <Star className="w-4 h-4 mr-2 fill-current" />
                  Featured
                </>
              ) : (
                <>
                  <StarOff className="w-4 h-4 mr-2" />
                  Not Featured
                </>
              )}
            </Button>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
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
                        : "Select shaft..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search shafts..." 
                        value={shaftSearch}
                        onValueChange={setShaftSearch}
                      />
                      <CommandEmpty>
                        <div className="p-4 text-sm text-center">
                          <p className="mb-2">No shaft found.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShaftOpen(false);
                              setShowAddShaft(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Shaft
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {shafts && shafts.length > 0 && shafts
                            .filter(shaft => {
                              const searchTerm = shaftSearch.toLowerCase();
                              return shaft.brand.toLowerCase().includes(searchTerm) ||
                                     shaft.model.toLowerCase().includes(searchTerm) ||
                                     (shaft.specs?.flex && shaft.specs.flex.toLowerCase().includes(searchTerm));
                            })
                            .map((shaft) => (
                              <CommandItem
                            key={shaft.id}
                            value={shaft.id}
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
                          ))}
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
                        : "Select grip..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search grips..." 
                        value={gripSearch}
                        onValueChange={setGripSearch}
                      />
                      <CommandEmpty>
                        <div className="p-4 text-sm text-center">
                          <p className="mb-2">No grip found.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setGripOpen(false);
                              setShowAddGrip(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Grip
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {grips && grips.length > 0 && grips
                            .filter(grip => {
                              const searchTerm = gripSearch.toLowerCase();
                              return grip.brand.toLowerCase().includes(searchTerm) ||
                                     grip.model.toLowerCase().includes(searchTerm) ||
                                     (grip.specs?.size && grip.specs.size.toLowerCase().includes(searchTerm));
                            })
                            .map((grip) => (
                              <CommandItem
                            key={grip.id}
                            value={grip.id}
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
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Loft Selection - Only show for clubs with loft options */}
            {isClub && loftOptions.length > 0 && (
              <div>
                <Label>Loft/Configuration</Label>
                <Select
                  value={formData.loft_option_id}
                  onValueChange={(value) => setFormData({ ...formData, loft_option_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select loft" />
                  </SelectTrigger>
                  <SelectContent>
                    {loftOptions.map((loft) => (
                      <SelectItem key={loft.id} value={loft.id}>
                        {loft.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleRemove} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove from Bag
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Equipment'}
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
