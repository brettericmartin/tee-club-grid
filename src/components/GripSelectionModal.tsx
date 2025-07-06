import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { GripOption } from "@/types/equipmentDetail";

interface GripSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  grips: GripOption[];
  currentGrip: GripOption;
  onSelect: (grip: GripOption) => void;
}

const GripSelectionModal = ({ isOpen, onClose, grips, currentGrip, onSelect }: GripSelectionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Select Grip</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Popular grip options:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grips.map((grip) => (
              <Card 
                key={grip.id} 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  grip.id === currentGrip.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelect(grip)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-background rounded-md flex items-center justify-center">
                      <div className="w-3 h-12 bg-gradient-to-b from-accent/30 to-accent/60 rounded-sm"></div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="font-semibold text-sm">{grip.brand}</h3>
                        {grip.isStock && (
                          <Badge variant="secondary" className="text-xs">Stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{grip.model}</p>
                      <p className="text-xs text-muted-foreground">Size: {grip.size}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold text-sm">
                        {grip.price === 0 ? 'Included' : `+$${grip.price}`}
                      </p>
                      <Button
                        size="sm"
                        variant={grip.id === currentGrip.id ? "default" : "outline"}
                        className="w-full"
                      >
                        {grip.id === currentGrip.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>

                    {grip.id === currentGrip.id && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GripSelectionModal;