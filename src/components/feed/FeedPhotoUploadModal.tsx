import { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FeedPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: () => void;
}

export function FeedPhotoUploadModal({ isOpen, onClose, onPhotoUploaded }: FeedPhotoUploadModalProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!user || !imageFile) return;

    try {
      setUploading(true);

      // Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('feed-photos')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('feed-photos')
        .getPublicUrl(fileName);

      // Create feed post
      const { error: postError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          type: 'equipment_photo',
          content: caption,
          image_url: publicUrl,
          metadata: {
            width: 800,
            height: 600
          }
        });

      if (postError) throw postError;

      toast.success('Photo shared successfully!');
      onPhotoUploaded();
      handleClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    setImagePreview(null);
    setImageFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Share Equipment Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload Area */}
          {!imagePreview ? (
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer">
                <Camera className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70">Click to upload a photo</p>
                <p className="text-white/50 text-sm mt-1">JPG, PNG up to 10MB</p>
              </div>
            </label>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-xl object-cover max-h-96"
              />
              <Button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Caption */}
          <Textarea
            placeholder="Add a caption... (e.g., 'New driver just arrived!' or 'Course conditions were perfect today')"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
          />

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
                'Share Photo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}