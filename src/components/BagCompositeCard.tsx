import { useState, useEffect } from "react";
import { ArrowUpRight, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BagData } from "@/data/sampleBagsData";
import EquipmentDetailModal from "./EquipmentDetailModal";
import { supabase } from "@/lib/supabase";
import { getEquipmentByOldId } from "@/lib/equipment-id-mapping";
import { TeedBallLike } from "@/components/shared/TeedBallLike";
import type { Database } from "@/lib/supabase";
import { formatCompactCurrency } from "@/lib/formatters";

type Equipment = Database['public']['Tables']['equipment']['Row'];

interface BagCompositeCardProps {
  bag: BagData;
  onToggleLike?: (bagId: string) => void;
  onToggleFollow?: (bagId: string) => void;
  onViewBag?: (bagId: string) => void;
}

import { EQUIPMENT_CATEGORIES } from '@/lib/equipment-categories';

// Helper function to check if equipment is a club (vs accessory)
const isClub = (category: string) => {
  return [
    EQUIPMENT_CATEGORIES.driver,
    EQUIPMENT_CATEGORIES.fairway_wood,
    EQUIPMENT_CATEGORIES.hybrid,
    EQUIPMENT_CATEGORIES.iron,
    EQUIPMENT_CATEGORIES.wedge,
    EQUIPMENT_CATEGORIES.putter
  ].includes(category);
};

const BagCompositeCard = ({ bag, onToggleLike, onToggleFollow, onViewBag }: BagCompositeCardProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [equipmentData, setEquipmentData] = useState<Record<string, Equipment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipmentData();
  }, [bag.featuredClubs, bag.featuredAccessories]);

  const loadEquipmentData = async () => {
    setLoading(true);
    const allIds = [...(bag.featuredClubs || []), ...(bag.featuredAccessories || [])];
    const equipmentMap: Record<string, Equipment> = {};

    // Load equipment data for each ID
    for (const id of allIds) {
      const equipment = await getEquipmentByOldId(id, supabase);
      if (equipment) {
        // Fetch equipment photos
        const { data: photos } = await supabase
          .from('equipment_photos')
          .select('photo_url, likes_count')
          .eq('equipment_id', equipment.id)
          .order('likes_count', { ascending: false });
        
        // Add most liked photo to equipment
        const mostLikedPhoto = photos?.[0]?.photo_url || null;
        equipmentMap[id] = {
          ...equipment,
          most_liked_photo: mostLikedPhoto,
          primaryPhoto: mostLikedPhoto || equipment.image_url
        } as Equipment;
      }
    }

    setEquipmentData(equipmentMap);
    setLoading(false);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLike?.(bag.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFollow?.(bag.id);
  };

  const handleEquipmentClick = (equipmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const equipment = equipmentData[equipmentId];
    if (equipment) {
      setSelectedEquipment({
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model,
        category: equipment.category,
        year: equipment.release_year || 2024,
        price: equipment.msrp ? Number(equipment.msrp) : 0,
        image: equipment.image_url || '',
        description: equipment.description || '',
        specs: equipment.specs || {},
        isFeatured: false
      });
      setEquipmentModalOpen(true);
    }
  };

  const handleCardClick = () => {
    onViewBag?.(bag.id);
  };

  // Split featured items into clubs and accessories
  const featuredClubs = bag.featuredClubs
    ?.map(id => ({ id, equipment: equipmentData[id] }))
    .filter(item => item.equipment && isClub(item.equipment.category))
    .slice(0, 4) || [];

  const featuredAccessories = bag.featuredAccessories
    ?.map(id => ({ id, equipment: equipmentData[id] }))
    .filter(item => item.equipment)
    .slice(0, 2) || [];

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-card hover:shadow-lg transition-shadow duration-300 p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Find the golf bag in the equipment
  const golfBag = Object.values(equipmentData).find(item => 
    item && item.category === 'bag'
  );
  const golfBagImage = golfBag?.image_url;

  return (
    <>
      <div
        className="group relative overflow-hidden transition-[transform,shadow] duration-300 hover:scale-[1.02] hover:shadow-2xl rounded-lg"
        onClick={handleCardClick}
      >
        {/* Background with golf bag image or gradient */}
        <div className="absolute inset-0">
          {golfBagImage ? (
            <>
              <img 
                src={golfBagImage} 
                alt="Golf Bag"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </>
          )}
        </div>

        {/* Content container */}
        <div className="relative bg-white/5 min-h-[400px]">
        {/* Header with user info */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={bag.userAvatar}
                alt={bag.userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                loading="lazy"
              />
              <div>
                <h3 className="font-semibold text-sm text-white">{bag.userName}</h3>
                <p className="text-xs text-white/70">{bag.userHandicap} HCP</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFollowClick}
              className="text-xs text-white hover:text-white/80"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              {bag.isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="p-4">
          {/* Bag title and stats */}
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-1 text-white">{bag.bagName}</h4>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>{formatCompactCurrency(bag.totalValue)}</span>
              <span>{bag.avgScore} avg</span>
            </div>
          </div>

          {/* Equipment Grid */}
          <div className="space-y-3">
            {/* Clubs */}
            {featuredClubs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">CLUBS</p>
                <div className="grid grid-cols-2 gap-2">
                  {featuredClubs.map(({ id, equipment }) => (
                    <div
                      key={id}
                      className="group relative bg-muted/20 rounded-md overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredItem(id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={(e) => handleEquipmentClick(id, e)}
                    >
                      <AspectRatio ratio={1}>
                        <img
                          src={(equipment as any).primaryPhoto || equipment.image_url || '/api/placeholder/150/150'}
                          alt={`${equipment.brand} ${equipment.model}`}
                          className="object-contain w-full h-full group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </AspectRatio>
                      {hoveredItem === id && (
                        <div className="absolute inset-0 bg-black/80 rounded-md flex items-center justify-center p-2">
                          <div className="text-center">
                            <p className="text-white text-xs font-medium">{equipment.brand}</p>
                            <p className="text-white/80 text-xs">{equipment.model}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessories */}
            {featuredAccessories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">ACCESSORIES</p>
                <div className="grid grid-cols-2 gap-2">
                  {featuredAccessories.map(({ id, equipment }) => (
                    <div
                      key={id}
                      className="group relative bg-muted/20 rounded-md overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredItem(id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={(e) => handleEquipmentClick(id, e)}
                    >
                      <AspectRatio ratio={1}>
                        <img
                          src={(equipment as any).primaryPhoto || equipment.image_url || '/api/placeholder/150/150'}
                          alt={`${equipment.brand} ${equipment.model}`}
                          className="object-contain w-full h-full group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </AspectRatio>
                      {hoveredItem === id && (
                        <div className="absolute inset-0 bg-black/80 rounded-md flex items-center justify-center p-2">
                          <div className="text-center">
                            <p className="text-white text-xs font-medium">{equipment.brand}</p>
                            <p className="text-white/80 text-xs">{equipment.model}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="p-4 border-t border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TeedBallLike
              isLiked={bag.isLiked || false}
              likeCount={bag.likes}
              onToggle={handleLikeClick}
              size="sm"
              showCount={true}
              className="text-white/70 hover:text-primary"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/70 hover:text-white"
          >
            View Full Bag
            <ArrowUpRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        </div>
      </div>

      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={equipmentModalOpen}
        onClose={() => setEquipmentModalOpen(false)}
      />
    </>
  );
};

export default BagCompositeCard;