import { useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  alt = 'High resolution image'
}: ImageViewerModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {/* High resolution image */}
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              loading="eager" // Load immediately for viewer
            />
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-sm bg-black/50 px-4 py-2 rounded-full">
            Click outside or press ESC to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}