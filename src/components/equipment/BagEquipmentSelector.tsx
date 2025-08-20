import { useState, useEffect } from 'react';
import { Package, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
  most_liked_photo?: string;
  primaryPhoto?: string;
}

interface BagEquipmentItem {
  id: string;
  equipment_id: string;
  custom_photo_url?: string;
  equipment: Equipment;
}

interface BagEquipmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
}

export function BagEquipmentSelector({ isOpen, onClose, onSelect }: BagEquipmentSelectorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bagEquipment, setBagEquipment] = useState<BagEquipmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadBagEquipment();
    }
  }, [isOpen, user]);

  const loadBagEquipment = async () => {
    if (!user) {
      setError('Please sign in to access your bag');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's primary bag (or first bag if no primary)
      const { data: bags, error: bagError } = await supabase
        .from('user_bags')
        .select('id, name, is_primary')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (bagError) throw bagError;

      if (!bags || bags.length === 0) {
        setError('No bag found. Please create a bag first.');
        setLoading(false);
        return;
      }

      const bagId = bags[0].id;

      // Load equipment from the bag
      const { data: equipment, error: equipmentError } = await supabase
        .from('bag_equipment')
        .select(`
          id,
          equipment_id,
          custom_photo_url,
          equipment (
            id,
            brand,
            model,
            category,
            image_url,
            equipment_photos (
              photo_url,
              likes_count
            )
          )
        `)
        .eq('bag_id', bagId)
        .order('added_at', { ascending: false });

      if (equipmentError) throw equipmentError;

      // Process equipment to get most liked photos
      const processedEquipment = (equipment || []).map(item => {
        if (item.equipment && item.equipment.equipment_photos) {
          // Sort photos by likes to get most liked
          const sortedPhotos = [...item.equipment.equipment_photos].sort(
            (a, b) => (b.likes_count || 0) - (a.likes_count || 0)
          );
          
          // Set the primary photo based on priority
          const primaryPhoto = item.custom_photo_url || 
                              sortedPhotos[0]?.photo_url || 
                              item.equipment.image_url;
          
          return {
            ...item,
            equipment: {
              ...item.equipment,
              most_liked_photo: sortedPhotos[0]?.photo_url,
              primaryPhoto
            }
          };
        }
        
        // No photos, use custom or default image
        return {
          ...item,
          equipment: {
            ...item.equipment,
            primaryPhoto: item.custom_photo_url || item.equipment?.image_url
          }
        };
      });

      setBagEquipment(processedEquipment);
    } catch (error) {
      console.error('Error loading bag equipment:', error);
      setError('Failed to load your bag equipment');
      toast.error('Failed to load bag equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: BagEquipmentItem) => {
    onSelect(item.equipment);
    onClose();
  };

  // Category display helper
  const getCategoryDisplay = (category: string): string => {
    const displays: Record<string, string> = {
      driver: 'Driver',
      fairway_wood: 'Fairway Wood',
      hybrid: 'Hybrid',
      iron: 'Irons',
      wedge: 'Wedge',
      putter: 'Putter',
      ball: 'Ball',
      bag: 'Bag',
      glove: 'Glove',
      rangefinder: 'Rangefinder',
      gps: 'GPS',
      accessories: 'Accessory'
    };
    return displays[category] || category;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select from Your Bag
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
            <p className="text-white/70">{error}</p>
            <Button onClick={() => loadBagEquipment()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : bagEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Package className="w-12 h-12 text-white/30" />
            <p className="text-white/70">Your bag is empty</p>
            <p className="text-sm text-white/50">Add equipment to your bag first</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bagEquipment.map((item) => (
                <Card
                  key={item.id}
                  className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                  onClick={() => handleSelect(item)}
                >
                  <div className="p-3 flex items-center gap-3">
                    {/* Equipment Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {item.equipment.primaryPhoto ? (
                        <img
                          src={item.equipment.primaryPhoto}
                          alt={`${item.equipment.brand} ${item.equipment.model}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Equipment Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {item.equipment.brand}
                      </h3>
                      <p className="text-sm text-white/70 truncate">
                        {item.equipment.model}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className="mt-1 bg-white/10 text-white/80 text-xs"
                      >
                        {getCategoryDisplay(item.equipment.category)}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}