import { useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadEquipmentPhoto } from '@/services/equipment';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { EquipmentSelectorSimple } from '../equipment/EquipmentSelectorSimple';

interface FeedPhotoUploadProps {
  onPhotoUploaded?: () => void;
}

export function FeedPhotoUpload({ onPhotoUploaded }: FeedPhotoUploadProps) {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !selectedEquipmentId) {
      toast.error('Please select equipment and a photo');
      return;
    }

    setIsUploading(true);
    try {
      // Upload the photo to equipment_photos and get the public URL
      const uploadedPhotoUrl = await uploadEquipmentPhoto(
        user.id,
        selectedEquipmentId,
        selectedFile,
        caption,
        false // Not primary photo
      );

      // Create a feed post for this photo upload with the actual uploaded URL
      const { error: feedError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          type: 'new_equipment',
          content: {
            equipment_id: selectedEquipmentId,
            equipment_name: selectedEquipmentName,
            caption: caption,
            photo_url: uploadedPhotoUrl, // Use the actual uploaded URL from Supabase Storage
            is_photo: true
          }
        });

      if (feedError) throw feedError;

      toast.success('Photo shared to feed!');
      resetForm();
      setShowDialog(false);
      onPhotoUploaded?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setSelectedEquipmentId(null);
    setSelectedEquipmentName(null);
  };

  const handleEquipmentSelect = (equipment: { id: string; brand: string; model: string }) => {
    setSelectedEquipmentId(equipment.id);
    setSelectedEquipmentName(`${equipment.brand} ${equipment.model}`);
    setShowEquipmentSelector(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Upload Button */}
      <Card className="glass-card p-4 mb-6">
        <button
          onClick={() => setShowDialog(true)}
          className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-[#3a3a3a] rounded-full flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <span className="text-white/70">Share your equipment photos...</span>
        </button>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Equipment Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Equipment Selection */}
            <div>
              <Label>Select Equipment</Label>
              {selectedEquipmentName ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#2a2a2a] mt-2">
                  <span className="text-sm">{selectedEquipmentName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEquipmentSelector(true)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowEquipmentSelector(true)}
                  className="w-full mt-2 glass-button"
                  variant="outline"
                >
                  Choose Equipment
                </Button>
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
                  className="cursor-pointer mt-2 bg-[#2a2a2a] border-white/20"
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
                className="mt-2 bg-[#2a2a2a] border-white/20 text-white placeholder:text-white/50"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowDialog(false);
                }}
                className="glass-button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedEquipmentId || isUploading}
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
    </>
  );
}