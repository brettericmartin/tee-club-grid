import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/shared/ImageCropDialog';
import { uploadAvatar } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  username?: string;
  onAvatarChange: (newUrl: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, username, onAvatarChange }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImageSrc(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);

    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user || !imageFile) return;

    try {
      setUploading(true);
      
      console.log('AvatarUpload - Processing cropped blob...');
      console.log('AvatarUpload - Blob details:', {
        size: croppedBlob.size,
        type: croppedBlob.type
      });
      
      // Create File from Blob
      const mimeType = croppedBlob.type || 'image/png';
      const extension = mimeType.split('/')[1] || 'png';
      const fileName = `avatar.${extension}`;
      
      const croppedFile = new File([croppedBlob], fileName, { type: mimeType });
      
      console.log('AvatarUpload - File created:', {
        name: croppedFile.name,
        size: croppedFile.size,
        type: croppedFile.type
      });

      // Validate the file before upload
      if (croppedFile.size === 0) {
        throw new Error('Cropped image is empty');
      }

      // Upload the cropped image
      const newAvatarUrl = await uploadAvatar(user.id, croppedFile);
      
      console.log('AvatarUpload - Upload complete, new URL:', newAvatarUrl);
      onAvatarChange(newAvatarUrl);
      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      
      // Provide specific error messages
      if (error.message?.includes('row level security')) {
        toast.error('Permission denied. Please ensure you are logged in.');
      } else if (error.message?.includes('storage/bucket')) {
        toast.error('Storage not configured. Please contact support.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection.');
      } else if (error.statusCode === 413) {
        toast.error('Image too large. Please use an image under 5MB.');
      } else {
        toast.error(`Failed to upload picture: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
      setShowCropDialog(false);
      setOriginalImageSrc(null);
      setImageFile(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setOriginalImageSrc(null);
    setImageFile(null);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="w-24 h-24">
            <AvatarImage 
              src={currentAvatarUrl || undefined}
              alt="Profile"
            />
            <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-2xl">
              {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Change Photo
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={handleCropCancel}
        imageSrc={originalImageSrc || ''}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        cropShape="round"
      />
    </>
  );
}