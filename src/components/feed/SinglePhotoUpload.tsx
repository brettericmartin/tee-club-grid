import { useState, useEffect } from 'react';
import { X, Loader2, Camera, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadEquipmentPhoto } from '@/services/equipment';
import { syncFeedPhotoToBagEquipment } from '@/services/equipmentPhotoSync';
import { createEquipmentPhotoPost } from '@/services/feedService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { EquipmentSelectorSimple } from '../equipment/EquipmentSelectorSimple';
import { BagEquipmentSelector } from '../equipment/BagEquipmentSelector';

interface SinglePhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SinglePhotoUpload({ isOpen, onClose, onSuccess }: SinglePhotoUploadProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [showBagEquipmentSelector, setShowBagEquipmentSelector] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error('Please select a photo');
      return;
    }

    setIsUploading(true);
    try {
      let photoUrl = '';
      
      // If equipment is selected, upload to equipment_photos table AND storage
      if (selectedEquipmentId && selectedEquipmentName) {
        // This uploads to storage AND creates equipment_photos record
        photoUrl = await uploadEquipmentPhoto(
          user.id,
          selectedEquipmentId,
          selectedFile,
          caption,
          false // Not primary photo
        );
        
        // Sync the photo to user's bag_equipment if they have this equipment
        const syncResult = await syncFeedPhotoToBagEquipment(
          user.id,
          selectedEquipmentId,
          photoUrl,
          false // Don't overwrite existing custom photos
        );
        
        if (syncResult.updated > 0) {
          console.log(`Updated ${syncResult.updated} bag equipment entries with new photo`);
        }
        
        // Create feed post using the existing service function
        await createEquipmentPhotoPost(
          user.id,
          selectedEquipmentId,
          selectedEquipmentName,
          photoUrl,
          caption
        );
      } else {
        // Upload without equipment tagging (general photo post)
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(`equipment-photos/${fileName}`, selectedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('equipment-images')
          .getPublicUrl(`equipment-photos/${fileName}`);
          
        photoUrl = publicUrl;
        
        // Create a general photo feed post (without equipment tagging)
        const { error: feedError } = await supabase
          .from('feed_posts')
          .insert({
            user_id: user.id,
            type: 'equipment_photo',
            media_urls: [photoUrl],
            content: {
              caption: caption || 'Check out this photo!',
              photo_url: photoUrl,
              is_photo: true
            }
          });

        if (feedError) throw feedError;
      }

      toast.success('Photo shared to feed!');
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setSelectedEquipmentId(null);
    setSelectedEquipmentName(null);
    onClose();
  };

  const handleEquipmentSelect = (equipment: { id: string; brand: string; model: string }) => {
    setSelectedEquipmentId(equipment.id);
    setSelectedEquipmentName(`${equipment.brand} ${equipment.model}`);
    setShowEquipmentSelector(false);
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={resetForm}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Equipment Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Equipment Selection (Optional) */}
            <div>
              <Label>Tag Equipment (Optional)</Label>
              <p className="text-xs text-white/60 mb-2">
                Tag equipment to add this photo to the equipment gallery
              </p>
              {selectedEquipmentName ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 mt-2">
                  <span className="text-sm">{selectedEquipmentName}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEquipmentSelector(true)}
                    >
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedEquipmentId(null);
                        setSelectedEquipmentName(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => setShowBagEquipmentSelector(true)}
                    className="flex-1 bg-white/10 border-white/20 hover:bg-white/20"
                    variant="outline"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    From My Bag
                  </Button>
                  <Button
                    onClick={() => setShowEquipmentSelector(true)}
                    className="flex-1 bg-white/10 border-white/20 hover:bg-white/20"
                    variant="outline"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    All Equipment
                  </Button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div>
              <Label htmlFor="photo">Photo</Label>
              {!previewUrl ? (
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer mt-2 bg-white/10 border-white/20"
                />
              ) : (
                <div className="relative mt-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What do you love about this equipment?"
                className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-white/40 mt-1">{caption.length}/500</div>
            </div>

            {/* Info Box */}
            {selectedEquipmentId && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-white/80">
                  This photo will be added to the {selectedEquipmentName} gallery for others to discover!
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-primary hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  'Share to Feed'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Selector Dialog */}
      {showEquipmentSelector && (
        <EquipmentSelectorSimple
          isOpen={showEquipmentSelector}
          onClose={() => setShowEquipmentSelector(false)}
          onSelect={handleEquipmentSelect}
        />
      )}
      
      {/* Bag Equipment Selector Dialog */}
      {showBagEquipmentSelector && (
        <BagEquipmentSelector
          isOpen={showBagEquipmentSelector}
          onClose={() => setShowBagEquipmentSelector(false)}
          onSelect={handleEquipmentSelect}
        />
      )}
    </>
  );
}