import { Button } from "@/components/ui/button";
import { Heart, Share2 } from "lucide-react";

interface EquipmentActionButtonsProps {
  isOwnBag: boolean;
  equipmentBrand: string;
  onSaveEquipment: () => void;
  onClose: () => void;
}

const EquipmentActionButtons = ({ 
  isOwnBag, 
  equipmentBrand, 
  onSaveEquipment, 
  onClose 
}: EquipmentActionButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
      {isOwnBag ? (
        <>
          <Button variant="default" onClick={onClose} className="flex-1">
            Save Changes
          </Button>
          <Button variant="destructive" className="flex-1">
            Remove from Bag
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="flex-1" onClick={onSaveEquipment}>
            <Heart className="w-4 h-4 mr-2" />
            Save Equipment
          </Button>
          <Button variant="default" className="flex-1">
            Buy Now - {equipmentBrand}.com
          </Button>
        </>
      )}
    </div>
  );
};

export default EquipmentActionButtons;