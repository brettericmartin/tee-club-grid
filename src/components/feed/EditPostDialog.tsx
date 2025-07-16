import { useState, useEffect } from 'react';
import { Edit, Crop, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageCropDialog } from '@/components/shared/ImageCropDialog';
import { FeedPost } from '@/services/feedService';
import { toast } from 'sonner';

interface EditPostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: FeedPost | null;
  onSave: (postId: string, updates: { caption?: string; media_urls?: string[] }) => void;
}

export function EditPostDialog({ isOpen, onClose, post, onSave }: EditPostDialogProps) {
  const [caption, setCaption] = useState('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.content?.caption || '');
      setCurrentImageUrl(post.media_urls?.[0] || null);
      setNewImageUrl(null);
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) return;

    try {
      setSaving(true);
      
      const updates: { caption?: string; media_urls?: string[] } = {
        caption: caption
      };

      // If user cropped a new image, include it
      if (newImageUrl) {
        updates.media_urls = [newImageUrl];
      }

      await onSave(post.id, updates);
      toast.success('Post updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Convert blob to URL for preview
    const croppedUrl = URL.createObjectURL(croppedImageBlob);
    setNewImageUrl(croppedUrl);
    setShowCropDialog(false);
    
    // TODO: Upload the cropped image to storage and get the real URL
    // For now, we'll just use the blob URL as a placeholder
    toast.info('Cropped image ready. Note: Image upload not implemented yet.');
  };

  const handleClose = () => {
    setCaption('');
    setCurrentImageUrl(null);
    setNewImageUrl(null);
    onClose();
  };

  if (!post) return null;

  const displayImageUrl = newImageUrl || currentImageUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-black/95 border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Post
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Post Image */}
            {displayImageUrl && (
              <div className="relative">
                <img
                  src={displayImageUrl}
                  alt="Post image"
                  className="w-full rounded-lg object-cover max-h-64"
                />
                
                {/* Crop Button */}
                {currentImageUrl && (
                  <Button
                    onClick={() => setShowCropDialog(true)}
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <Crop className="w-4 h-4 mr-1" />
                    Re-crop
                  </Button>
                )}

                {/* New Image Indicator */}
                {newImageUrl && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    Cropped
                  </div>
                )}
              </div>
            )}

            {/* Caption Editor */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your post..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
                rows={4}
              />
            </div>

            {/* Post Type Info */}
            <div className="text-sm text-white/60">
              <p>Post Type: {post.type.replace('_', ' ').toUpperCase()}</p>
              {post.equipment && (
                <p>Equipment: {post.equipment.brand} {post.equipment.model}</p>
              )}
              {post.bag && (
                <p>Bag: {post.bag.name}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      {currentImageUrl && (
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={() => setShowCropDialog(false)}
          imageSrc={currentImageUrl}
          onCropComplete={handleCropComplete}
          aspectRatio={1} // Square aspect ratio for feed posts
        />
      )}
    </>
  );
}