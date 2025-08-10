import { useState } from 'react';
import { Camera, Send, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createEquipmentFeedPost, createBagUpdateFeedPost } from '@/services/feedService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface FeedPostPromptProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    type: 'equipment_added' | 'equipment_photo' | 'bag_updated';
    equipmentId?: string;
    equipmentName?: string;
    bagId: string;
    bagName?: string;
    existingPhotoUrl?: string;
  };
  onSuccess?: () => void;
}

export function FeedPostPrompt({ 
  isOpen, 
  onClose, 
  context,
  onSuccess 
}: FeedPostPromptProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Generate default content based on context
  const getDefaultContent = () => {
    switch (context.type) {
      case 'equipment_added':
        return `Just added ${context.equipmentName || 'new equipment'} to my bag! 🏌️`;
      case 'equipment_photo':
        return `Check out my ${context.equipmentName || 'equipment'}! ⛳`;
      case 'bag_updated':
        return `Updated my ${context.bagName || 'bag'} setup! 🎒`;
      default:
        return '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePost = async () => {
    if (!user || (!content.trim() && !selectedFile && !context.existingPhotoUrl)) {
      toast.error('Please add some content or a photo');
      return;
    }

    setUploading(true);
    try {
      let photoUrl = context.existingPhotoUrl;

      // Upload photo if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('equipment-photos')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('equipment-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Create feed post based on context
      const feedContent = content.trim() || getDefaultContent();
      
      await createBagUpdateFeedPost({
        userId: user.id,
        bagId: context.bagId,
        content: feedContent,
        equipmentId: context.equipmentId,
        mediaUrls: photoUrl ? [photoUrl] : []
      });

      toast.success('Posted to feed!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating feed post:', error);
      toast.error('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  const handleSkip = () => {
    // Track that user skipped to implement smart prompting later
    if (user) {
      localStorage.setItem(`feed_prompt_skip_${user.id}`, Date.now().toString());
    }
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[#1f1f1f] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Share Your Update
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1">
            Let your followers know about your bag changes
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">What's new?</Label>
            <Textarea
              id="content"
              placeholder={getDefaultContent()}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] bg-[#2a2a2a] border-gray-600 text-white resize-none"
              maxLength={280}
            />
            <p className="text-xs text-gray-400 text-right">
              {content.length}/280
            </p>
          </div>

          {/* Photo Upload/Preview */}
          <div className="space-y-2">
            <Label>Add a photo</Label>
            
            {/* Show existing photo if provided */}
            {context.existingPhotoUrl && !selectedFile && (
              <div className="relative rounded-lg overflow-hidden bg-[#2a2a2a] aspect-video">
                <img
                  src={context.existingPhotoUrl}
                  alt="Equipment"
                  className="w-full h-full object-cover"
                />
                <p className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  Using uploaded photo
                </p>
              </div>
            )}

            {/* Show preview if new file selected */}
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden bg-[#2a2a2a] aspect-video">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload button */}
            {!previewUrl && !context.existingPhotoUrl && (
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  id="photo-upload"
                />
                <Label
                  htmlFor="photo-upload"
                  className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
                >
                  <Camera className="h-6 w-6 text-gray-400" />
                  <span className="text-gray-400">Click to upload photo</span>
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white"
          >
            Skip for now
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handlePost}
              disabled={uploading || (!content.trim() && !selectedFile && !context.existingPhotoUrl)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share to Feed
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}