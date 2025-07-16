import { useState } from 'react';
import { X, Upload, Camera, Globe, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { createEquipmentPhotoFeedPost } from '@/services/feedService';
import { useFeed } from '@/contexts/FeedContext';
import { syncUserPhotoToEquipment } from '@/services/equipmentPhotoSync';
import { ImageCropDialog } from './ImageCropDialog';

interface UnifiedPhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (photoUrl: string) => void;
  context?: {
    type: 'equipment' | 'bag' | 'general';
    equipmentId?: string;
    equipmentName?: string;
    bagId?: string;
    bagName?: string;
  };
  initialCaption?: string;
}

export function UnifiedPhotoUploadDialog({
  isOpen,
  onClose,
  onUploadComplete,
  context,
  initialCaption = ''
}: UnifiedPhotoUploadDialogProps) {
  const { user } = useAuth();
  const { refreshFeeds } = useFeed();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageSrc = reader.result as string;
        setOriginalImageSrc(imageSrc);
        setImagePreview(imageSrc);
        // For equipment photos, automatically open crop dialog
        if (context?.type === 'equipment') {
          setShowCropDialog(true);
        } else {
          // For other contexts, convert to file for direct upload
          setImageFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedImageBlob], 'cropped-image.png', {
      type: 'image/png',
    });
    
    setImageFile(croppedFile);
    
    // Create preview URL for the cropped image
    const croppedPreviewUrl = URL.createObjectURL(croppedImageBlob);
    setImagePreview(croppedPreviewUrl);
    
    setShowCropDialog(false);
  };

  const handleUpload = async () => {
    if (!user || !imageFile) return;

    try {
      setUploading(true);

      // Create storage bucket name - we'll use a unified bucket
      const bucketName = 'equipment-photos';
      
      // Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // First, check if bucket exists by trying to list files
      const { data: listData, error: listError } = await supabase.storage
        .from(bucketName)
        .list('test', { limit: 1 });

      if (listError && listError.message.includes('not found')) {
        // Bucket doesn't exist - show helpful message
        toast.error('Storage not configured. Please contact support to set up the equipment-photos storage bucket.');
        return;
      }
      
      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Sync photo to equipment_photos table for equipment page display
      if (context?.type === 'equipment' && context.equipmentId) {
        try {
          await syncUserPhotoToEquipment(
            user.id,
            context.equipmentId,
            publicUrl,
            caption || `${context.equipmentName || 'Equipment'} photo`
          );
          console.log('Photo synced to equipment gallery');
        } catch (error) {
          console.error('Error syncing photo to equipment:', error);
          // Don't fail the whole upload if sync fails
        }
      }

      // Create feed post if user opted in
      if (shareToFeed && context?.type === 'equipment' && context.equipmentId) {
        try {
          await createEquipmentPhotoFeedPost(
            user.id,
            context.equipmentId,
            context.equipmentName || 'equipment',
            publicUrl,
            caption || `Check out my ${context.equipmentName || 'equipment'}! 📸`,
            context.bagId
          );
          toast.success('Photo shared to feed!');
          // Refresh feeds to show the new post
          await refreshFeeds();
        } catch (error) {
          console.error('Error creating feed post:', error);
          // Don't fail the whole upload if feed post fails
        }
      }

      // Call the completion handler
      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

      toast.success('Photo uploaded successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.message?.includes('bucket')) {
        toast.error('Storage not configured. Please contact support.');
      } else {
        toast.error(error.message || 'Failed to upload photo');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption(initialCaption);
    setImagePreview(null);
    setImageFile(null);
    setShareToFeed(true);
    setShowCropDialog(false);
    setOriginalImageSrc(null);
    onClose();
  };

  const getTitle = () => {
    if (context?.type === 'equipment' && context.equipmentName) {
      return `Upload photo of ${context.equipmentName}`;
    }
    return 'Upload Equipment Photo';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload Area */}
          {!imagePreview ? (
            <div className="space-y-3">
              {/* Mobile Camera Button */}
              <label className="block md:hidden">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    input?.click();
                  }}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </Button>
              </label>

              {/* File Upload Button */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 md:hidden"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    input?.click();
                  }}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Choose from Gallery
                </Button>

                {/* Desktop Upload Area */}
                <div className="hidden md:block border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/50 hover:bg-white/5 transition-colors cursor-pointer">
                  <Camera className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">Click to upload a photo</p>
                  <p className="text-white/50 text-sm mt-1">JPG, PNG up to 10MB</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-xl object-cover max-h-96"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {/* Crop button for equipment photos */}
                {context?.type === 'equipment' && originalImageSrc && (
                  <Button
                    onClick={() => setShowCropDialog(true)}
                    size="icon"
                    variant="ghost"
                    className="bg-black/50 hover:bg-black/70"
                    title="Crop photo"
                  >
                    <Crop className="w-4 h-4" />
                  </Button>
                )}
                {/* Remove button */}
                <Button
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setOriginalImageSrc(null);
                  }}
                  size="icon"
                  variant="ghost"
                  className="bg-black/50 hover:bg-black/70"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder={context?.equipmentName 
                ? `Share details about your ${context.equipmentName}...`
                : "Add a caption..."
              }
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
            />
          </div>

          {/* Share to Feed Option */}
          <div className="flex items-center space-x-2 p-4 bg-white/5 rounded-lg">
            <Checkbox
              id="share-to-feed"
              checked={shareToFeed}
              onCheckedChange={(checked) => setShareToFeed(checked as boolean)}
              className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex-1">
              <Label 
                htmlFor="share-to-feed" 
                className="text-base font-normal cursor-pointer flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Share to community feed
              </Label>
              <p className="text-sm text-white/60 mt-1">
                Let others see your equipment setup
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!imageFile || uploading}
              className="bg-primary hover:bg-primary/90"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                'Upload Photo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Crop Dialog */}
      {originalImageSrc && (
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={() => setShowCropDialog(false)}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={context?.type === 'equipment' ? 4/3 : 1} // Equipment photos use 4:3, others use square
        />
      )}
    </Dialog>
  );
}