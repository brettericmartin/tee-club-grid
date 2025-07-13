import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { EquipmentDetail } from "@/types/equipmentDetail";
import { formatCurrency } from "@/lib/formatters";

interface EquipmentHeaderProps {
  equipment: EquipmentDetail | any;
  isOwnBag: boolean;
  onToggleFeatured: () => void;
}

const EquipmentHeader = ({ equipment, isOwnBag, onToggleFeatured }: EquipmentHeaderProps) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-2">{equipment.brand}</p>
        <h1 className="text-3xl font-bold text-foreground mb-2">{equipment.model}</h1>
        <p className="text-muted-foreground">
          {equipment.category} {equipment.specs?.loft && `• ${equipment.specs.loft}`}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-2xl font-bold text-foreground">
          MSRP: {formatCurrency(equipment.msrp || 0)}
        </p>
        {equipment.currentBuild && (
          <p className="text-lg text-muted-foreground">
            Your Build: {formatCurrency(equipment.currentBuild.totalPrice)}
          </p>
        )}
      </div>

      {isOwnBag ? (
        <div className="flex items-center gap-2">
          <Button
            variant={equipment.isFeatured ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 ${
              equipment.isFeatured 
                ? "bg-primary text-primary-foreground" 
                : "border-border hover:bg-muted"
            }`}
            onClick={onToggleFeatured}
          >
            <Star className={`w-4 h-4 ${equipment.isFeatured ? "fill-current" : ""}`} />
            {equipment.isFeatured ? "Featured" : "Add to Featured"}
          </Button>
        </div>
      ) : (
        equipment.isFeatured && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-primary" />
              Featured
            </Badge>
          </div>
        )
      )}
    </div>
  );
};

export default EquipmentHeader;