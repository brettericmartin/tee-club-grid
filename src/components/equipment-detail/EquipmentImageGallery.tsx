import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { savePhoto, unsavePhoto, arePhotosSaved } from '@/services/savedPhotos';
import { toast } from 'sonner';

interface EquipmentImageGalleryProps {
  images: string[];
  brand: string;
  model: string;
  selectedImageIndex: number;
  onImageSelect: (index: number) => void;
  equipmentId?: string;
  onImageClick?: (imageUrl: string) => void;
}

const EquipmentImageGallery = ({ 
  images, 
  brand, 
  model, 
  selectedImageIndex, 
  onImageSelect,
  equipmentId,
  onImageClick
}: EquipmentImageGalleryProps) => {
  const { user } = useAuth();
  const [savedPhotos, setSavedPhotos] = useState<Record<string, boolean>>({});
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user && images.length > 0) {
      checkSavedStatus();
    }
  }, [user, images]);

  const checkSavedStatus = async () => {
    if (!user) return;
    try {
      const savedStatus = await arePhotosSaved(user.id, images);
      setSavedPhotos(savedStatus);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSavePhoto = async (photoUrl: string) => {
    if (!user) {
      toast.error('Please sign in to save photos');
      return;
    }

    setSavingPhoto(photoUrl);
    try {
      if (savedPhotos[photoUrl]) {
        await unsavePhoto(user.id, photoUrl);
        setSavedPhotos(prev => ({ ...prev, [photoUrl]: false }));
        toast.success('Photo removed from saved items');
      } else {
        await savePhoto(user.id, {
          photo_url: photoUrl,
          source_type: 'equipment_photo',
          equipment_id: equipmentId,
        });
        setSavedPhotos(prev => ({ ...prev, [photoUrl]: true }));
        toast.success('Photo saved! View in your Saved tab');
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Failed to save photo');
    } finally {
      setSavingPhoto(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="aspect-square bg-background rounded-lg flex items-center justify-center overflow-hidden relative group">
        <img
          src={images[selectedImageIndex] || images[0]}
          alt={`${brand} ${model}`}
          className="w-full h-full object-contain cursor-zoom-in"
          onClick={() => onImageClick && onImageClick(images[selectedImageIndex] || images[0])}
        />
        {user && (
          <Button
            size="sm"
            variant={savedPhotos[images[selectedImageIndex]] ? "default" : "secondary"}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleSavePhoto(images[selectedImageIndex])}
            disabled={savingPhoto === images[selectedImageIndex]}
          >
            {savingPhoto === images[selectedImageIndex] ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : savedPhotos[images[selectedImageIndex]] ? (
              <>
                <BookmarkCheck className="w-4 h-4 mr-1" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onImageSelect(index)}
              className={`flex-shrink-0 w-16 h-16 bg-background rounded-md overflow-hidden border-2 ${
                selectedImageIndex === index ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img
                src={image}
                alt={`View ${index + 1}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipmentImageGallery;