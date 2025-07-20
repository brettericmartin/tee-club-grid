import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Crop as CropIcon, RotateCw, Check, X, Square } from 'lucide-react';
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
  userDisplayName?: string; // For watermark
  showSquarePreview?: boolean; // Show square preview for bag cards
}

// Helper function to create a canvas and crop the image with resizing and watermark
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  userDisplayName?: string,
  fileName: string = 'cropped-image.jpg'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate crop dimensions in natural resolution
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  // Use original dimensions without downsizing
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  // Enable image smoothing for better quality when resizing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the cropped and resized image
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // Add watermark if display name is provided
  if (userDisplayName) {
    // Calculate font size based on image dimensions
    const fontSize = Math.max(14, Math.min(24, cropWidth / 40));
    const padding = fontSize * 0.8;

    // Set up text styling
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Add shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Draw watermark text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`© ${userDisplayName}`, cropWidth - padding, cropHeight - padding);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob'));
      }
    }, 'image/jpeg', 0.95);
  });
}

export function ImageCropDialog({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio, // Now optional - undefined means freeform
  userDisplayName,
  showSquarePreview = true // Default to showing square preview
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [squarePreview, setSquarePreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const squareCanvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Start with a centered crop
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        4/3, // Start with 4:3 for equipment photos
        width,
        height,
      ),
      width,
      height,
    );
    
    setCrop(initialCrop);
  }, []);

  // Generate square preview whenever crop changes
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !showSquarePreview) return;

    const canvas = squareCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate crop dimensions in natural resolution
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    // Create a square from the center of the crop
    const squareSize = Math.min(cropWidth, cropHeight);
    const squareX = cropX + (cropWidth - squareSize) / 2;
    const squareY = cropY + (cropHeight - squareSize) / 2;

    // Set canvas size (preview size)
    canvas.width = 200;
    canvas.height = 200;

    // Draw the square portion
    ctx.drawImage(
      image,
      squareX,
      squareY,
      squareSize,
      squareSize,
      0,
      0,
      200,
      200
    );

    // Convert to data URL for preview
    setSquarePreview(canvas.toDataURL('image/jpeg', 0.95));
  }, [completedCrop, showSquarePreview]);

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedImageBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        userDisplayName,
        'equipment-photo.jpg'
      );
      
      onCropComplete(croppedImageBlob);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const [freeformMode, setFreeformMode] = useState(true);
  const [selectedRatio, setSelectedRatio] = useState<number | undefined>(undefined);

  const presetCrops = [
    { label: 'Freeform', ratio: undefined },
    { label: 'Square', ratio: 1 },
    { label: 'Equipment', ratio: 4/3 },
    { label: 'Wide', ratio: 16/9 }
  ];

  const applyPresetCrop = (ratio: number | undefined) => {
    if (!imgRef.current) return;

    setSelectedRatio(ratio);
    setFreeformMode(ratio === undefined);

    if (ratio !== undefined) {
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/20 text-white max-w-5xl max-h-[90vh] overflow-hidden">
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
                variant={selectedRatio === preset.ratio ? "default" : "outline"}
                size="sm"
                onClick={() => applyPresetCrop(preset.ratio)}
                className={
                  selectedRatio === preset.ratio
                    ? "bg-primary hover:bg-primary/90"
                    : "border-white/20 text-white hover:bg-white/10"
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Main content area with crop and preview */}
          <div className="flex gap-4 items-start">
            {/* Crop Area */}
            <div className="flex-1 flex justify-center max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(crop) => setCrop(crop)}
                onComplete={(crop) => setCompletedCrop(crop)}
                aspect={selectedRatio}
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

            {/* Square Preview */}
            {showSquarePreview && (
              <div className="flex-shrink-0 space-y-2">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-white/80 mb-2">Bag Card Preview</h3>
                  <div className="bg-white/10 p-2 rounded-lg">
                    {squarePreview ? (
                      <img
                        src={squarePreview}
                        alt="Square preview"
                        className="w-[200px] h-[200px] rounded-lg"
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] rounded-lg bg-white/5 flex items-center justify-center">
                        <Square className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-2 max-w-[200px]">
                    This shows how your photo will appear in bag cards (1:1 ratio)
                  </p>
                </div>
                {/* Hidden canvas for square preview generation */}
                <canvas
                  ref={squareCanvasRef}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center text-white/60 text-sm">
            <p>Drag the corners to adjust the crop area</p>
            <p>Use "Freeform" for custom shapes or select a preset ratio</p>
            {showSquarePreview && (
              <p className="text-primary/80 mt-1">The square preview shows how your photo appears in bag cards</p>
            )}
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