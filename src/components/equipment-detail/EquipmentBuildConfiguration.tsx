import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EquipmentDetail } from "@/types/equipmentDetail";

interface EquipmentBuildConfigurationProps {
  equipment: EquipmentDetail;
  isOwnBag: boolean;
  onShaftChange: () => void;
  onGripChange: () => void;
}

const EquipmentBuildConfiguration = ({ 
  equipment, 
  isOwnBag, 
  onShaftChange, 
  onGripChange 
}: EquipmentBuildConfigurationProps) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Build</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background rounded-md flex items-center justify-center">
                <div className="w-2 h-12 bg-gradient-to-b from-muted to-muted-foreground rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Shaft</h3>
                <p className="text-sm text-muted-foreground">
                  {equipment.currentBuild.shaft.brand} {equipment.currentBuild.shaft.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {equipment.currentBuild.shaft.flex} • {equipment.currentBuild.shaft.weight}
                </p>
                {equipment.currentBuild.shaft.price > 0 && (
                  <p className="text-sm font-medium text-primary">
                    +${equipment.currentBuild.shaft.price}
                  </p>
                )}
              </div>
            </div>
            {isOwnBag ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={onShaftChange}
              >
                Change Shaft
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => {}}
              >
                View Details
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background rounded-md flex items-center justify-center">
                <div className="w-3 h-12 bg-gradient-to-b from-accent/30 to-accent/60 rounded-sm"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Grip</h3>
                <p className="text-sm text-muted-foreground">
                  {equipment.currentBuild.grip.brand} {equipment.currentBuild.grip.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {equipment.currentBuild.grip.size}
                </p>
                {equipment.currentBuild.grip.price > 0 && (
                  <p className="text-sm font-medium text-primary">
                    +${equipment.currentBuild.grip.price}
                  </p>
                )}
              </div>
            </div>
            {isOwnBag ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={onGripChange}
              >
                Change Grip
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => {}}
              >
                View Details
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentBuildConfiguration;