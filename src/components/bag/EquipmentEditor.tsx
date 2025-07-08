import { useState, useEffect } from 'react';
import { Camera, Edit3, Star, StarOff, X, Images } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CommunityPhotosGallery } from './CommunityPhotosGallery';
import type { Database } from '@/lib/supabase';

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
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
  const [shafts, setShafts] = useState<any[]>([]);
  const [grips, setGrips] = useState<any[]>([]);
  const [loftOptions, setLoftOptions] = useState<any[]>([]);
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  
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
        .from('shafts')
        .select('*')
        .eq('category', equipment.equipment.category)
        .order('is_stock', { ascending: false })
        .order('brand');
      
      if (shaftData) setShafts(shaftData);

      // Load grips
      const { data: gripData } = await supabase
        .from('grips')
        .select('*')
        .order('is_stock', { ascending: false })
        .order('brand');
      
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

  const handlePhotoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipment.equipment_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('equipment-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, show helpful error
        if (uploadError.message.includes('bucket')) {
          toast.error('Storage bucket not configured. Please contact support.');
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('equipment-photos')
        .getPublicUrl(filePath);

      // Save to equipment_photos table for community sharing
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: dbError } = await supabase.from('equipment_photos').insert({
          equipment_id: equipment.equipment_id,
          photo_url: publicUrl,
          user_id: user.id,
          is_primary: false
        });
        
        if (!dbError) {
          // Reload photos to show the new one
          await loadEquipmentPhotos();
        }
      }

      setFormData({ ...formData, custom_photo_url: publicUrl });
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  src={formData.custom_photo_url || equipment.equipment.image_url || '/placeholder.svg'}
                  alt={`${equipment.equipment.brand} ${equipment.equipment.model}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="hidden"
                  id="photo-upload"
                />
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Custom Photo
                    </span>
                  </Button>
                </Label>
                {formData.custom_photo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, custom_photo_url: '' })}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Custom Photo
                  </Button>
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
            {/* Shaft Selection */}
            {shafts.length > 0 && (
              <div>
                <Label>Shaft</Label>
                <Select
                  value={formData.shaft_id}
                  onValueChange={(value) => setFormData({ ...formData, shaft_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shaft" />
                  </SelectTrigger>
                  <SelectContent>
                    {shafts.map((shaft) => (
                      <SelectItem key={shaft.id} value={shaft.id}>
                        {shaft.brand} {shaft.model} - {shaft.flex}
                        {shaft.is_stock && ' (Stock)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grip Selection */}
            <div>
              <Label>Grip</Label>
              <Select
                value={formData.grip_id}
                onValueChange={(value) => setFormData({ ...formData, grip_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grip" />
                </SelectTrigger>
                <SelectContent>
                  {grips.map((grip) => (
                    <SelectItem key={grip.id} value={grip.id}>
                      {grip.brand} {grip.model} - {grip.size}
                      {grip.is_stock && ' (Stock)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loft Selection */}
            {loftOptions.length > 0 && (
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
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
    </>
  );
}