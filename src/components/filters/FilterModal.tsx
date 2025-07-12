import { FC, ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const FilterModal: FC<FilterModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "glass-card border-white/20 text-white",
          "max-w-2xl w-[95vw] max-h-[85vh]",
          "p-0 gap-0",
          className
        )}
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {title}
            </DialogTitle>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;