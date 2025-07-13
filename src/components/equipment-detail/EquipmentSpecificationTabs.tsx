import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentDetail } from "@/types/equipmentDetail";

interface EquipmentSpecificationTabsProps {
  equipment: EquipmentDetail | any;
}

const EquipmentSpecificationTabs = ({ equipment }: EquipmentSpecificationTabsProps) => {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="specs">Specs</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="inbags">In Bags</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-muted-foreground">{equipment.description}</p>
        </div>
        {equipment.features && equipment.features.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Key Features</h3>
            <ul className="space-y-1">
              {equipment.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </TabsContent>

      <TabsContent value="specs" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {equipment.specs && Object.entries(equipment.specs).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-border">
              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-muted-foreground">{value}</span>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="reviews" className="space-y-4">
        <div className="text-center py-8 text-muted-foreground">
          <p>Reviews coming soon...</p>
        </div>
      </TabsContent>

      <TabsContent value="inbags" className="space-y-4">
        <div className="text-center py-8 text-muted-foreground">
          <p>See who else has this in their bag...</p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default EquipmentSpecificationTabs;