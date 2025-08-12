import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShaftOption } from "@/types/equipmentDetail";

interface ShaftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shafts: ShaftOption[];
  currentShaft: ShaftOption;
  onSelect: (shaft: ShaftOption) => void;
}

const ShaftSelectionModal = ({ isOpen, onClose, shafts, currentShaft, onSelect }: ShaftSelectionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Shaft</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Popular shaft options for this club:
          </p>

          <div className="space-y-3">
            {shafts.map((shaft) => (
              <Card 
                key={shaft.id} 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  shaft.id === currentShaft.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelect(shaft)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-background rounded-md flex items-center justify-center">
                      <div className="w-2 h-12 bg-gradient-to-b from-muted to-muted-foreground rounded-full"></div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{shaft.brand} {shaft.model}</h3>
                        {shaft.isStock && (
                          <Badge variant="secondary" className="text-xs">Stock</Badge>
                        )}
                        {shaft.id === currentShaft.id && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Flex: {shaft.flex}</span>
                        <span>Weight: {shaft.weight}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {shaft.price === 0 ? 'Included' : `+$${shaft.price}`}
                      </p>
                      <Button
                        size="sm"
                        variant={shaft.id === currentShaft.id ? "default" : "outline"}
                        className="mt-2"
                      >
                        {shaft.id === currentShaft.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
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

export default ShaftSelectionModal;