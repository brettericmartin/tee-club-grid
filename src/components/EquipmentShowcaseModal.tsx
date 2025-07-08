import { useState, useEffect } from 'react';
import { X, Heart, Star, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { getTopBagsWithEquipment } from '@/services/equipmentBags';
import type { Database } from '@/lib/supabase';

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
  loft_option?: Database['public']['Tables']['loft_options']['Row'];
};

interface EquipmentShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagEquipment: BagEquipmentItem | null;
}

export function EquipmentShowcaseModal({
  isOpen,
  onClose,
  bagEquipment,
}: EquipmentShowcaseModalProps) {
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [topBags, setTopBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bagEquipment) {
      loadAdditionalData();
    }
  }, [isOpen, bagEquipment]);

  const loadAdditionalData = async () => {
    if (!bagEquipment) return;
    
    setLoading(true);
    try {
      // Load equipment photos
      const { data: photos } = await supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', bagEquipment.equipment_id)
        .order('likes_count', { ascending: false });
      
      if (photos) setEquipmentPhotos(photos);

      // Load top bags with this equipment
      const bags = await getTopBagsWithEquipment(bagEquipment.equipment_id);
      setTopBags(bags);
    } catch (error) {
      console.error('Error loading additional data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!bagEquipment) return null;

  const allPhotos = [
    bagEquipment.custom_photo_url,
    bagEquipment.equipment.image_url,
    ...equipmentPhotos.map(p => p.photo_url)
  ].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {bagEquipment.equipment.brand} {bagEquipment.equipment.model}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                {allPhotos[selectedPhotoIndex] ? (
                  <img
                    src={allPhotos[selectedPhotoIndex]}
                    alt={`${bagEquipment.equipment.brand} ${bagEquipment.equipment.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
              
              {allPhotos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                        selectedPhotoIndex === index
                          ? 'border-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment Details */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Equipment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand</span>
                    <span className="font-medium">{bagEquipment.equipment.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{bagEquipment.equipment.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium capitalize">
                      {bagEquipment.equipment.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {bagEquipment.equipment.msrp && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MSRP</span>
                      <span className="font-medium">${bagEquipment.equipment.msrp}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customization */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Build Configuration</h3>
                <div className="space-y-3">
                  {bagEquipment.shaft && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Shaft</p>
                      <p className="font-medium">
                        {bagEquipment.shaft.brand} {bagEquipment.shaft.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bagEquipment.shaft.flex} flex
                      </p>
                    </div>
                  )}
                  
                  {bagEquipment.grip && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Grip</p>
                      <p className="font-medium">
                        {bagEquipment.grip.brand} {bagEquipment.grip.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bagEquipment.grip.size} size
                      </p>
                    </div>
                  )}
                  
                  {bagEquipment.loft_option && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Loft</p>
                      <p className="font-medium">{bagEquipment.loft_option.display_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Condition & Notes */}
              {(bagEquipment.condition || bagEquipment.notes) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Additional Info</h3>
                  {bagEquipment.condition && (
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Condition: </span>
                      <Badge variant="secondary" className="capitalize">
                        {bagEquipment.condition}
                      </Badge>
                    </div>
                  )}
                  {bagEquipment.notes && (
                    <p className="text-sm text-muted-foreground">{bagEquipment.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabs for Specs and Top Bags */}
          <Tabs defaultValue="specs" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="bags">
                <Users className="w-4 h-4 mr-2" />
                Popular Bags ({topBags.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="specs" className="mt-4">
              <div className="p-4 bg-muted rounded-lg">
                {bagEquipment.equipment.specs && Object.keys(bagEquipment.equipment.specs).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(bagEquipment.equipment.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No specifications available
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="bags" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {topBags.map((bag) => (
                    <div
                      key={bag.bagId}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={bag.user.avatar} />
                          <AvatarFallback>
                            {bag.user.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{bag.bagName}</p>
                          <p className="text-sm text-muted-foreground">
                            @{bag.user.username} • Handicap {bag.user.handicap || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{bag.likesCount}</span>
                      </div>
                    </div>
                  ))}
                  
                  {topBags.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No other bags found with this equipment
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}