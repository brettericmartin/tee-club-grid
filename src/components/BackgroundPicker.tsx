import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bagBackgrounds, BagBackground } from "./BackgroundLayer";

interface BackgroundPickerProps {
  currentBackground: BagBackground['id'];
  onBackgroundChange: (backgroundId: BagBackground['id']) => void;
}

const BackgroundPicker = ({ currentBackground, onBackgroundChange }: BackgroundPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleBackgroundSelect = (backgroundId: BagBackground['id']) => {
    onBackgroundChange(backgroundId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Palette Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-50 bg-background/10 backdrop-blur-sm border border-border/20 hover:bg-background/20"
      >
        <Palette className="w-4 h-4" />
      </Button>

      {/* Background Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Background</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 p-4">
            {bagBackgrounds.map((bg) => (
              <div
                key={bg.id}
                className="relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105"
                style={{
                  borderColor: currentBackground === bg.id ? 'hsl(var(--primary))' : 'transparent'
                }}
                onClick={() => handleBackgroundSelect(bg.id)}
              >
                {/* Preview */}
                <div className="aspect-video relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                  <div className={`absolute inset-0 ${bg.overlayOpacity}`} />
                  
                  {/* Selected indicator */}
                  {currentBackground === bg.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-primary rounded-full p-2">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3 bg-card">
                  <h3 className="font-medium text-sm">{bg.name}</h3>
                  <p className="text-xs text-muted-foreground">{bg.description}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BackgroundPicker;