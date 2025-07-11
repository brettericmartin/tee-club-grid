import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string, cropData: CropData) => void;
  aspectRatio?: number; // Default 1:1 for square
  title?: string;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export function ImageCropper({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete,
  aspectRatio = 1,
  title = 'Crop Image'
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && imageUrl) {
      loadImage();
    }
  }, [isOpen, imageUrl]);

  const loadImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for cross-origin images
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      drawCanvas();
    };
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
    };
    img.src = imageUrl;
  };

  const drawCanvas = () => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas size to match container
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate crop area (centered square by default)
    const cropSize = Math.min(containerWidth, containerHeight) * 0.8;
    const cropWidth = cropSize;
    const cropHeight = cropSize / aspectRatio;
    const cropX = (containerWidth - cropWidth) / 2;
    const cropY = (containerHeight - cropHeight) / 2;

    // Save context state
    ctx.save();

    // Create clipping mask for crop area
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropWidth, cropHeight);
    ctx.clip();

    // Clear the crop area (remove dark overlay)
    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);

    // Apply transformations
    ctx.translate(containerWidth / 2 + position.x, containerHeight / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Draw image centered
    const img = imageRef.current;
    ctx.drawImage(
      img,
      -img.width / 2,
      -img.height / 2,
      img.width,
      img.height
    );

    // Restore context
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 1; i < 3; i++) {
      const x = cropX + (cropWidth / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, cropY);
      ctx.lineTo(x, cropY + cropHeight);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      const y = cropY + (cropHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(cropX, y);
      ctx.lineTo(cropX + cropWidth, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [scale, rotation, position, imageLoaded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    console.log('handleCrop called');
    console.log('Refs:', { 
      canvas: !!canvasRef.current, 
      image: !!imageRef.current, 
      container: !!containerRef.current 
    });
    
    if (!canvasRef.current || !imageRef.current || !containerRef.current) {
      console.error('Missing required refs');
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    console.log('Container dimensions:', { containerWidth, containerHeight });

    // Calculate crop area
    const cropSize = Math.min(containerWidth, containerHeight) * 0.8;
    const cropWidth = cropSize;
    const cropHeight = cropSize / aspectRatio;
    const cropX = (containerWidth - cropWidth) / 2;
    const cropY = (containerHeight - cropHeight) / 2;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');
    
    if (!cropCtx) return;

    // Clear the canvas first
    cropCtx.clearRect(0, 0, cropWidth, cropHeight);

    // Apply transformations and draw cropped area
    cropCtx.save();
    cropCtx.translate(cropWidth / 2, cropHeight / 2);
    
    // Apply the rotation and scale
    cropCtx.rotate((rotation * Math.PI) / 180);
    cropCtx.scale(scale, scale);

    const img = imageRef.current;
    
    // Calculate the offset to center the image in the crop area
    const offsetX = position.x / scale;
    const offsetY = position.y / scale;
    
    cropCtx.drawImage(
      img,
      -img.width / 2 + offsetX,
      -img.height / 2 + offsetY,
      img.width,
      img.height
    );
    cropCtx.restore();

    // Convert to blob
    cropCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }
      
      const croppedUrl = URL.createObjectURL(blob);
      const cropData: CropData = {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
        scale,
        rotation
      };
      
      onCropComplete(croppedUrl, cropData);
    }, 'image/jpeg', 0.9);
  };

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 p-6 pt-2">
          <div 
            ref={containerRef}
            className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        <div className="p-6 pt-0 space-y-4">
          {/* Zoom Control */}
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-4">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[rotation]}
              onValueChange={([value]) => setRotation(value)}
              min={-180}
              max={180}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {rotation}°
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetTransform}>
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCrop}>
                <Check className="w-4 h-4 mr-2" />
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}