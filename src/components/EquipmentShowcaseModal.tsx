import { useState, useEffect } from 'react';
import { X, Heart, Star, Users, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
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
import { savePhoto, unsavePhoto, arePhotosSaved } from '@/services/savedPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase';

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['equipment']['Row'];
  grip?: Database['public']['Tables']['equipment']['Row'];
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
  const { user } = useAuth();
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [topBags, setTopBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<Record<string, boolean>>({});
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null);

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

      // Check saved status for all photos if user is logged in
      if (user && photos) {
        const allPhotoUrls = [
          bagEquipment.custom_photo_url,
          bagEquipment.equipment?.image_url,
          ...photos.map(p => p.photo_url)
        ].filter(Boolean);

        const savedStatus = await arePhotosSaved(user.id, allPhotoUrls);
        setSavedPhotos(savedStatus);
      }
    } catch (error) {
      console.error('Error loading additional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhoto = async (photoUrl: string, photoIndex: number) => {
    if (!user) {
      toast.error('Please sign in to save photos');
      return;
    }

    setSavingPhoto(photoUrl);
    try {
      if (savedPhotos[photoUrl]) {
        // Unsave the photo
        await unsavePhoto(user.id, photoUrl);
        setSavedPhotos(prev => ({ ...prev, [photoUrl]: false }));
        toast.success('Photo removed from saved items');
      } else {
        // Save the photo
        const photoData = equipmentPhotos.find(p => p.photo_url === photoUrl);
        await savePhoto(user.id, {
          photo_url: photoUrl,
          source_type: photoData ? 'equipment_photo' : 'bag_equipment',
          source_id: photoData?.id || bagEquipment.id,
          equipment_id: bagEquipment.equipment_id,
          saved_from_user_id: photoData?.user_id || bagEquipment.user_id,
        });
        setSavedPhotos(prev => ({ ...prev, [photoUrl]: true }));
        toast.success('Photo saved! View in your Saved tab');
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Failed to save photo');
    } finally {
      setSavingPhoto(null);
    }
  };

  if (!bagEquipment) return null;

  const allPhotos = [
    bagEquipment?.custom_photo_url,
    bagEquipment?.equipment?.image_url,
    ...equipmentPhotos.map(p => p.photo_url)
  ].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {bagEquipment?.equipment?.brand || 'Unknown'} {bagEquipment?.equipment?.model || 'Equipment'}
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
              <div className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                {allPhotos[selectedPhotoIndex] ? (
                  <>
                    <img
                      src={allPhotos[selectedPhotoIndex]}
                      alt={`${bagEquipment.equipment.brand} ${bagEquipment.equipment.model}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Save button overlay */}
                    {user && (
                      <Button
                        size="sm"
                        variant={savedPhotos[allPhotos[selectedPhotoIndex]] ? "default" : "secondary"}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleSavePhoto(allPhotos[selectedPhotoIndex], selectedPhotoIndex)}
                        disabled={savingPhoto === allPhotos[selectedPhotoIndex]}
                      >
                        {savingPhoto === allPhotos[selectedPhotoIndex] ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : savedPhotos[allPhotos[selectedPhotoIndex]] ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    )}
                  </>
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
                      className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                        selectedPhotoIndex === index
                          ? 'border-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Equipment Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/equipment/${bagEquipment.equipment.id}`}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Product Page
                  </Button>
                </div>
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

              {/* Customization - Only show for clubs */}
              {bagEquipment?.equipment?.category && ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(bagEquipment.equipment.category) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Build Configuration</h3>
                  <div className="space-y-3">
                    {bagEquipment.shaft && (
                    <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                      {bagEquipment.shaft.image_url && (
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={bagEquipment.shaft.image_url}
                            alt={`${bagEquipment.shaft.brand} ${bagEquipment.shaft.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Shaft</p>
                        <p className="font-medium">
                          {bagEquipment.shaft.brand} {bagEquipment.shaft.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bagEquipment.shaft.specs?.flex && `${bagEquipment.shaft.specs.flex} flex`}
                          {bagEquipment.shaft.specs?.weight && ` • ${bagEquipment.shaft.specs.weight}g`}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {bagEquipment.grip && (
                    <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                      {bagEquipment.grip.image_url && (
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={bagEquipment.grip.image_url}
                            alt={`${bagEquipment.grip.brand} ${bagEquipment.grip.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Grip</p>
                        <p className="font-medium">
                          {bagEquipment.grip.brand} {bagEquipment.grip.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bagEquipment.grip.specs?.size && `${bagEquipment.grip.specs.size} size`}
                          {bagEquipment.grip.specs?.color && ` • ${bagEquipment.grip.specs.color}`}
                        </p>
                      </div>
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
              )}

              {/* Special display for standalone shaft/grip equipment */}
              {bagEquipment?.equipment?.category && ['shaft', 'grip'].includes(bagEquipment.equipment.category) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {bagEquipment.equipment.category === 'shaft' ? 'Shaft Details' : 'Grip Details'}
                  </h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="space-y-3">
                      {/* Display equipment-specific details */}
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium capitalize">{bagEquipment.equipment.category}</span>
                        </div>
                        {bagEquipment.equipment.specs && (
                          <>
                            {bagEquipment.equipment.specs.flex && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Flex</span>
                                <span className="font-medium">{bagEquipment.equipment.specs.flex}</span>
                              </div>
                            )}
                            {bagEquipment.equipment.specs.weight && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Weight</span>
                                <span className="font-medium">{bagEquipment.equipment.specs.weight}g</span>
                              </div>
                            )}
                            {bagEquipment.equipment.specs.size && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Size</span>
                                <span className="font-medium">{bagEquipment.equipment.specs.size}</span>
                              </div>
                            )}
                            {bagEquipment.equipment.specs.color && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Color</span>
                                <span className="font-medium">{bagEquipment.equipment.specs.color}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {bagEquipment.notes && (
                        <div className="pt-3 border-t">
                          <p className="text-sm text-muted-foreground">{bagEquipment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Condition & Notes - Hide for shaft/grip as they're shown above */}
              {(bagEquipment.condition || bagEquipment.notes) && bagEquipment?.equipment?.category && !['shaft', 'grip'].includes(bagEquipment.equipment.category) && (
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