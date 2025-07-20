import { useState } from 'react';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadEquipmentPhoto } from '@/services/equipment';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EquipmentPhotoManagerProps {
  equipmentId: string;
  photos: Array<{
    id: string;
    photo_url: string;
    caption?: string;
    is_primary: boolean;
    user?: {
      username: string;
    };
  }>;
  onPhotosUpdate?: () => void;
}

export function EquipmentPhotoManager({ 
  equipmentId, 
  photos = [], 
  onPhotosUpdate 
}: EquipmentPhotoManagerProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      await uploadEquipmentPhoto(
        user.id,
        equipmentId,
        selectedFile,
        caption,
        photos.length === 0 // Make first photo primary
      );

      toast.success('Photo uploaded successfully!');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setCaption('');
      setPreviewUrl(null);
      onPhotosUpdate?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async (url: string) => {
    if (!user) return;

    try {
      // In a real app, you'd validate the URL and possibly download/re-upload it
      const { data, error } = await supabase
        .from('equipment_photos')
        .insert({
          equipment_id: equipmentId,
          user_id: user.id,
          photo_url: url,
          caption: caption,
          is_primary: photos.length === 0
        });

      if (error) throw error;
      
      toast.success('Photo added successfully!');
      setShowUploadDialog(false);
      setCaption('');
      onPhotosUpdate?.();
    } catch (error) {
      console.error('URL upload error:', error);
      toast.error('Failed to add photo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Community Photos</h3>
        {user && (
          <Button 
            onClick={() => setShowUploadDialog(true)}
            size="sm"
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Add Photo
          </Button>
        )}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id} 
            className="relative group overflow-hidden cursor-pointer"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || 'Equipment photo'}
              className="w-full h-48 object-cover"
            />
            {photo.is_primary && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                <Star className="w-3 h-3" />
                Primary
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm truncate">
                {photo.caption || 'No caption'}
              </p>
              <p className="text-white/70 text-xs">
                by {photo.user?.display_name || photo.user?.username || 'Unknown'}
              </p>
            </div>
          </Card>
        ))}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No photos yet. Be the first to add one!</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="photo">Upload Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded"
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

            {/* Caption */}
            <div>
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe your photo..."
              />
            </div>

            {/* URL Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or add from URL
                </span>
              </div>
            </div>

            <div>
              <Input
                placeholder="https://example.com/golf-club.jpg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    handleUrlUpload(e.currentTarget.value);
                  }
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}