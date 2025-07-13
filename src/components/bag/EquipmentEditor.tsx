import { useState, useEffect } from 'react';
import { Camera, Edit3, Star, StarOff, X, Images, Crop } from 'lucide-react';
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
import { ImageCropper } from '@/components/ImageCropper';
import { UnifiedPhotoUploadDialog } from '@/components/shared/UnifiedPhotoUploadDialog';
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
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
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
            {isClub && shafts.length > 0 && (
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

            {/* Grip Selection - Only show for clubs */}
            {isClub && (
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
    </>
  );
}
export default EquipmentEditor;
