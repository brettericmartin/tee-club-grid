import { useState } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadEquipmentPhoto } from '@/services/equipment';
import { createEquipmentPhotoFeedPost } from '@/services/feedService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface QuickPhotoUploadProps {
  equipmentId: string;
  equipmentName: string;
  onPhotoUploaded?: () => void;
  trigger?: React.ReactNode;
}

export function QuickPhotoUpload({ 
  equipmentId, 
  equipmentName,
  onPhotoUploaded,
  trigger
}: QuickPhotoUploadProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(true);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error('Please select a file and sign in');
      return;
    }

    setUploading(true);
    try {
      // Upload the photo
      const photoUrl = await uploadEquipmentPhoto(
        user.id,
        equipmentId,
        selectedFile,
        caption || `Photo of ${equipmentName}`,
        false // Not primary by default
      );

      // Create feed post if checkbox is checked
      if (shareToFeed && photoUrl) {
        try {
          // Get user's primary bag
          const { data: userBag } = await supabase
            .from('user_bags')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .maybeSingle();

          await createEquipmentPhotoFeedPost(
            user.id,
            equipmentId,
            equipmentName,
            photoUrl,
            caption,
            userBag?.id
          );
        } catch (feedError) {
          console.error('Feed post creation failed:', feedError);
          // Don't fail the whole upload if feed post fails
        }
      }

      toast.success('Photo uploaded successfully!');
      setIsOpen(false);
      setSelectedFile(null);
      setCaption('');
      setPreviewUrl(null);
      setShareToFeed(true);
      onPhotoUploaded?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error?.message || 'Failed to upload photo';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setCaption('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (!user) {
    return null; // Don't show upload button if not logged in
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
        >
          <Camera className="w-4 h-4 mr-2" />
          Add Photo
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {equipmentName}
            </div>

            {!previewUrl ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <div className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG up to 10MB
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  Remove
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="share-to-feed"
                checked={shareToFeed}
                onCheckedChange={(checked) => setShareToFeed(checked as boolean)}
              />
              <Label
                htmlFor="share-to-feed"
                className="text-sm font-normal cursor-pointer"
              >
                Share to feed
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}