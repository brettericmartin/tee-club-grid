import { useState } from 'react';
import { Heart, Eye, TrendingUp, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getBrandAbbreviation } from '@/utils/brandAbbreviations';
import { cn } from '@/lib/utils';
import { EquipmentShowcaseModal } from '@/components/EquipmentShowcaseModal';

interface BagEquipmentItem {
  id: string;
  position: number;
  custom_photo_url?: string;
  purchase_price?: number;
  is_featured?: boolean;
  equipment?: {
    id: string;
    brand: string;
    model: string;
    category: string;
    image_url?: string;
    msrp?: number;
  };
}

interface BagCardProps {
  bag: {
    id: string;
    name: string;
    background_image?: string;
    created_at: string;
    likes_count: number;
    views_count: number;
    is_trending?: boolean;
    profiles?: {
      username: string;
      display_name: string;
      avatar_url?: string;
      handicap?: number;
    };
    bag_equipment?: BagEquipmentItem[];
  };
  onView: (bagId: string) => void;
  onLike?: (bagId: string) => void;
  isLiked?: boolean;
}

export function BagCard({ bag, onView, onLike, isLiked = false }: BagCardProps) {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [selectedBagEquipment, setSelectedBagEquipment] = useState<BagEquipmentItem | null>(null);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  
  // Find the actual golf bag equipment (category 'bag' or 'golf_bag')
  const allEquipment = bag.bag_equipment || [];
  const golfBag = allEquipment.find(item => 
    item.equipment && ['bag', 'golf_bag', 'bags'].includes(item.equipment.category)
  );
  
  // Get the golf bag image
  const golfBagImage = golfBag?.custom_photo_url || golfBag?.equipment?.image_url;
  console.log('Golf bag found:', golfBag?.equipment?.brand, golfBag?.equipment?.model, 'image:', golfBagImage);
  
  // Separate clubs and accessories (excluding the bag itself)
  const clubs = allEquipment.filter(item => 
    item.equipment && 
    !['balls', 'gloves', 'speakers', 'tees', 'towels', 'ball_marker', 'accessories', 'bag', 'golf_bag', 'bags'].includes(item.equipment.category)
  );
  const accessories = allEquipment.filter(item => 
    item.equipment && ['balls', 'gloves', 'speakers', 'tees', 'towels', 'ball_marker', 'accessories'].includes(item.equipment.category)
  );
  
  // Sort by featured first, then by position
  const sortEquipment = (items: BagEquipmentItem[]) => 
    items.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.position || 0) - (b.position || 0);
    });
  
  // Get 6 clubs for main grid (3x2)
  const displayClubs = sortEquipment([...clubs]).slice(0, 6);
  
  // Get 4 accessories for bottom row
  const displayAccessories = sortEquipment([...accessories]).slice(0, 4);
  
  // Calculate total value
  const totalValue = allEquipment.reduce((sum, item) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;
  
  const clubCount = clubs.length;

  const getEquipmentImage = (item: BagEquipmentItem) => {
    if (item.custom_photo_url && !imageError[item.id]) {
      return item.custom_photo_url;
    }
    if (item.equipment?.image_url && !imageError[`${item.id}-equipment`]) {
      return item.equipment.image_url;
    }
    return null;
  };

  const handleEquipmentClick = (e: React.MouseEvent, item: BagEquipmentItem) => {
    e.stopPropagation(); // Prevent card click
    console.log('Equipment clicked:', item.equipment.brand, item.equipment.model);
    setSelectedBagEquipment(item);
    setEquipmentModalOpen(true);
  };

  return (
    <>
      <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
    >
      {/* Background with glassmorphic effect */}
      <div className="absolute inset-0">
        {golfBagImage && !imageError['golf-bag'] ? (
          // Use the actual golf bag image
          <>
            <img 
              src={golfBagImage} 
              alt="Golf Bag"
              className="w-full h-full object-cover object-center"
              onError={() => {
                setImageError(prev => ({ ...prev, 'golf-bag': true }));
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
          </>
        ) : (
          // Fallback to gradient if no golf bag found
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              <div className="absolute inset-0 bg-black/40" />
              {/* Pattern overlay for visual interest */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="golf-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="1.5" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#golf-pattern)" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Glassmorphic container */}
      <div 
        className="relative backdrop-blur-sm bg-white/5 p-4 h-full min-h-[400px] cursor-pointer"
        onClick={() => onView(bag.id)}
      >
        {/* Header with user info */}
        <div className="flex items-start justify-between mb-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src={bag.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-white">
                {bag.profiles?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {bag.profiles?.display_name || bag.profiles?.username || 'Unknown'}
              </h3>
              {bag.profiles?.handicap !== undefined && (
                <p className="text-xs text-white/70">
                  Handicap: {bag.profiles.handicap}
                </p>
              )}
            </div>
          </div>
          
          {/* Trending badge */}
          {(bag.is_trending || bag.likes_count > 50) && (
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        {/* Bag name */}
        <h4 className="text-lg font-bold text-white mb-4">{bag.name}</h4>

        {/* 3x2 Clubs Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: 6 }).map((_, index) => {
            const item = displayClubs[index];
            const imageUrl = item ? getEquipmentImage(item) : null;
            
            return (
              <div 
                key={index}
                className="aspect-square rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm relative group/item cursor-pointer z-10"
                onClick={(e) => item && handleEquipmentClick(e, item)}
              >
                {item ? (
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${item.equipment?.brand} ${item.equipment?.model}`}
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(prev => ({
                          ...prev,
                          [item.custom_photo_url ? item.id : `${item.id}-equipment`]: true
                        }));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                      <span className="text-white font-bold text-lg">
                        {getBrandAbbreviation(item.equipment?.brand || '')}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
                
                {/* Featured indicator */}
                {item?.is_featured && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
                
                {/* Hover overlay with equipment name */}
                {item && (
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1">
                    <p className="text-white text-xs text-center line-clamp-2">
                      {item.equipment?.brand} {item.equipment?.model}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Accessories Row - 4 smaller items */}
        <div className="grid grid-cols-4 gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: 4 }).map((_, index) => {
            const item = displayAccessories[index];
            const imageUrl = item ? getEquipmentImage(item) : null;
            
            return (
              <div 
                key={`acc-${index}`}
                className="aspect-square rounded-md overflow-hidden bg-white/10 backdrop-blur-sm relative group/item cursor-pointer z-10"
                onClick={(e) => item && handleEquipmentClick(e, item)}
              >
                {item ? (
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${item.equipment?.brand} ${item.equipment?.model}`}
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(prev => ({
                          ...prev,
                          [`${item.id}-acc`]: true
                        }));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                      <span className="text-white font-semibold text-xs">
                        {getBrandAbbreviation(item.equipment?.brand || '')}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
                
                {/* Hover overlay with equipment name */}
                {item && (
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1">
                    <p className="text-white text-[10px] text-center line-clamp-2">
                      {item.equipment?.brand} {item.equipment?.model}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between text-white/90 text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{clubCount}</span>
              <span className="text-xs text-white/70">clubs</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">${totalValue.toLocaleString()}</span>
              <span className="text-xs text-white/70">value</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(bag.id);
              }}
              className="flex items-center gap-1 hover:scale-110 transition-transform"
            >
              <Heart 
                className={cn(
                  "w-4 h-4",
                  isLiked ? "fill-red-500 text-red-500" : "text-white/70"
                )}
              />
              <span className="text-xs">{bag.likes_count || 0}</span>
            </button>
            
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-white/70" />
              <span className="text-xs">{bag.views_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>

    {/* Equipment Showcase Modal */}
    <EquipmentShowcaseModal
      bagEquipment={selectedBagEquipment}
      isOpen={equipmentModalOpen}
      onClose={() => {
        setEquipmentModalOpen(false);
        setSelectedBagEquipment(null);
      }}
    />
  </>
  );
}