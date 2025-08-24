import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Heart } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TeedBallLike } from '@/components/shared/TeedBallLike';

interface Photo {
  id: string;
  photo_url: string;
  caption?: string;
  likes_count?: number;
  is_liked_by_user?: boolean;
  user?: {
    username?: string;
    display_name?: string;
  };
}

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  initialPhotoIndex?: number;
  onLike?: (photoId: string, isLiked: boolean) => Promise<void>;
  showLikes?: boolean;
  className?: string;
}

export function PhotoLightbox({
  isOpen,
  onClose,
  photos,
  initialPhotoIndex = 0,
  onLike,
  showLikes = true,
  className
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Reset when photos change or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialPhotoIndex);
      setScale(1);
      setImageError(false);
    }
  }, [isOpen, initialPhotoIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  const navigatePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setScale(1);
    setImageError(false);
  }, [photos.length]);

  const navigateNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setScale(1);
    setImageError(false);
  }, [photos.length]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const handleDownload = useCallback(() => {
    const photo = photos[currentIndex];
    if (!photo) return;

    const link = document.createElement('a');
    link.href = photo.photo_url;
    link.download = `equipment-photo-${photo.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentIndex, photos]);

  const handleLike = useCallback(async () => {
    const photo = photos[currentIndex];
    if (!photo || !onLike) return;

    await onLike(photo.id, photo.is_liked_by_user || false);
  }, [currentIndex, photos, onLike]);

  // Touch gesture support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      navigateNext();
    } else if (isRightSwipe) {
      navigatePrevious();
    }
  };

  if (!photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-[95vw] max-h-[95vh] w-full h-full p-0",
          "bg-black/95 backdrop-blur-sm",
          "border border-white/10 rounded-lg",
          "md:max-w-6xl md:max-h-[90vh]",
          className
        )}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {photos.length > 1 && (
                  <span className="text-white/80 text-sm">
                    {currentIndex + 1} / {photos.length}
                  </span>
                )}
                {currentPhoto.user && (
                  <span className="text-white/60 text-sm">
                    @{currentPhoto.user.display_name || currentPhoto.user.username}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white/80 hover:text-white hover:bg-white/20"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Image Container */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden p-4"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Previous Button */}
            {photos.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={navigatePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <div className="relative flex items-center justify-center w-full h-full">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                </div>
              )}
              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white/60 p-8">
                  <X className="h-16 w-16 mb-4" />
                  <p>Failed to load image</p>
                </div>
              ) : (
                <img
                  src={currentPhoto.photo_url}
                  alt={currentPhoto.caption || "Equipment photo"}
                  className="max-w-full max-h-[calc(100%-2rem)] object-contain transition-transform duration-200 rounded-lg"
                  style={{ transform: `scale(${scale})` }}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setImageError(true);
                  }}
                  draggable={false}
                />
              )}
            </div>

            {/* Next Button */}
            {photos.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetZoom}
                  className="text-white/80 hover:text-white hover:bg-white/20 px-3"
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </div>

              {/* Like Button */}
              {showLikes && onLike && (
                <div className="flex items-center gap-4">
                  <TeedBallLike
                    isLiked={currentPhoto.is_liked_by_user || false}
                    likeCount={currentPhoto.likes_count || 0}
                    onLike={handleLike}
                    size="lg"
                    showCount={true}
                    className="text-white hover:text-primary"
                  />
                </div>
              )}

              {/* Caption */}
              {currentPhoto.caption && (
                <div className="flex-1 px-4">
                  <p className="text-white/80 text-sm text-center line-clamp-2">
                    {currentPhoto.caption}
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail Strip (for multiple photos) */}
            {photos.length > 1 && photos.length <= 10 && (
              <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setScale(1);
                      setImageError(false);
                    }}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all",
                      index === currentIndex
                        ? "border-primary scale-110"
                        : "border-white/20 hover:border-white/40"
                    )}
                  >
                    <img
                      src={photo.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(PhotoLightbox);