import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Crop as CropIcon, RotateCw, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number; // 1 for square, 16/9 for landscape, etc.
}

// Helper function to create a canvas and crop the image
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string = 'cropped-image.png'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, 'image/png', 0.9);
  });
}

export function ImageCropDialog({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1 // Default to square
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Center crop with the desired aspect ratio
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspectRatio,
        width,
        height,
      ),
      width,
      height,
    );
    
    setCrop(crop);
  }, [aspectRatio]);

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedImageBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        'equipment-photo.png'
      );
      
      onCropComplete(croppedImageBlob);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const presetCrops = [
    { label: 'Square', ratio: 1 },
    { label: 'Equipment', ratio: 4/3 },
    { label: 'Wide', ratio: 16/9 }
  ];

  const applyPresetCrop = (ratio: number) => {
    if (!imgRef.current) return;

    const { width, height } = imgRef.current;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        ratio,
        width,
        height,
      ),
      width,
      height,
    );
    
    setCrop(newCrop);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/20 text-white max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <CropIcon className="w-5 h-5" />
            Crop Your Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Presets */}
          <div className="flex gap-2 justify-center">
            {presetCrops.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPresetCrop(preset.ratio)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Crop Area */}
          <div className="flex justify-center max-h-[60vh] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(crop) => setCrop(crop)}
              onComplete={(crop) => setCompletedCrop(crop)}
              aspect={aspectRatio}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                style={{ maxHeight: '500px', maxWidth: '100%' }}
                onLoad={onImageLoad}
                className="rounded-lg"
              />
            </ReactCrop>
          </div>

          {/* Instructions */}
          <div className="text-center text-white/60 text-sm">
            <p>Drag the corners to adjust the crop area</p>
            <p>Use the preset buttons above for common aspect ratios</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}