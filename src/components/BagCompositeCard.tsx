import { useState } from "react";
import { Heart, ArrowUpRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BagData } from "@/data/sampleBagsData";
import { realGolfEquipment } from "@/utils/realEquipmentData";
import EquipmentDetailModal from "./EquipmentDetailModal";
import { sampleEquipmentDetails } from "@/data/sampleEquipmentDetails";

interface BagCompositeCardProps {
  bag: BagData;
  onToggleLike?: (bagId: string) => void;
  onToggleFollow?: (bagId: string) => void;
  onViewBag?: (bagId: string) => void;
}

// Helper function to get equipment details by ID
const getEquipmentById = (id: string) => {
  return realGolfEquipment.find(item => item.id === id);
};

// Helper function to check if equipment is a club (vs accessory)
const isClub = (category: string) => {
  return ['driver', 'mini_driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'].includes(category);
};

const BagCompositeCard = ({ bag, onToggleLike, onToggleFollow, onViewBag }: BagCompositeCardProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLike?.(bag.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFollow?.(bag.id);
  };

  const handleViewBag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewBag?.(bag.id);
  };

  const handleEquipmentClick = (e: React.MouseEvent, equipmentId: string) => {
    e.stopPropagation();
    const equipment = realGolfEquipment.find(item => item.id === equipmentId);
    if (equipment) {
      // Try to get detailed equipment data, fallback to basic info
      const equipmentDetail = sampleEquipmentDetails[equipmentId] || {
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model,
        category: equipment.category,
        specs: {},
        msrp: equipment.price,
        description: "Professional golf equipment",
        features: [],
        images: [equipment.image_url],
        popularShafts: [],
        popularGrips: [],
        currentBuild: {
          shaft: {
            id: "stock",
            brand: equipment.brand,
            model: "Stock",
            flex: "Regular",
            weight: "Standard",
            price: 0,
            imageUrl: "",
            isStock: true
          },
          grip: {
            id: "stock",
            brand: equipment.brand,
            model: "Stock",
            size: "Standard",
            price: 0,
            imageUrl: "",
            isStock: true
          },
          totalPrice: equipment.price
        },
        isFeatured: false
      };
      setSelectedEquipment(equipmentDetail);
      setEquipmentModalOpen(true);
    }
  };

  // Get equipment details for featured items
  const featuredClubsData = bag.featuredClubs
    .map(id => getEquipmentById(id))
    .filter(Boolean)
    .slice(0, 6);

  const featuredAccessoriesData = bag.featuredAccessories
    .map(id => getEquipmentById(id))
    .filter(Boolean)
    .slice(0, 4);

  // Handicap badge color based on skill level
  const getHandicapBadgeColor = (handicap: number) => {
    if (handicap <= 5) return "bg-primary text-primary-foreground";
    if (handicap <= 15) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <div className="group relative cursor-pointer" onClick={() => onViewBag?.(bag.id)}>
        <AspectRatio ratio={3/4}>
          <div className="relative w-full h-full overflow-hidden rounded-lg bg-card border border-border shadow-card transition-all duration-300 group-hover:scale-105 group-hover:shadow-hover">
            
            {/* Background bag image */}
            <div className="absolute inset-0">
              <img 
                src={bag.bagImage}
                alt={bag.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Permanent View Bag button - top right */}
            <button
              onClick={handleViewBag}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors cursor-pointer z-20"
            >
              <ArrowUpRight className="w-4 h-4 text-white" />
            </button>

            {/* Featured clubs in 3x2 grid */}
            <div className="absolute top-[8%] left-[8%] right-[8%] bottom-[40%]">
              <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
                {featuredClubsData.map((equipment, index) => {
                  if (!equipment || index >= 6) return null;
                  
                  const isHoveredItem = hoveredItem === `club-${index}`;
                  
                  return (
                    <div 
                      key={equipment.id}
                      className={`relative transition-all duration-300 cursor-pointer ${
                        isHoveredItem ? 'scale-110 z-10' : ''
                      }`}
                      onMouseEnter={() => setHoveredItem(`club-${index}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={(e) => handleEquipmentClick(e, equipment.id)}
                    >
                      <div className="w-full aspect-square bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-lg p-2 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-white/15 hover:shadow-2xl">
                        <div className="w-full h-full">
                          <img 
                            src={equipment.image_url}
                            alt={`${equipment.brand} ${equipment.model}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div 
                            className="w-full h-full bg-muted rounded flex items-center justify-center text-xs font-medium text-muted-foreground"
                            style={{ display: 'none' }}
                          >
                            <span>{equipment.brand}</span>
                          </div>
                        </div>
                        
                        {/* Equipment name on hover */}
                        {isHoveredItem && (
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {equipment.brand} {equipment.model}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Featured accessories strip */}
            {featuredAccessoriesData.length > 0 && (
              <div className="absolute bottom-[28%] left-4 right-4">
                <div className="bg-white/5 backdrop-blur-[8px] rounded-lg p-2 shadow-lg border border-white/10">
                  <div className="flex justify-center gap-2">
                    {featuredAccessoriesData.map((equipment, index) => {
                      if (!equipment) return null;
                      
                      const isHoveredAccessory = hoveredItem === `accessory-${index}`;
                      
                      return (
                        <div 
                          key={equipment.id}
                          className={`relative w-[60px] h-[60px] transition-all duration-200 cursor-pointer ${
                            isHoveredAccessory ? 'scale-110 z-10' : ''
                          }`}
                          onMouseEnter={() => setHoveredItem(`accessory-${index}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={(e) => handleEquipmentClick(e, equipment.id)}
                        >
                          <div className="w-full h-full bg-background/50 backdrop-blur-sm rounded shadow-md p-1">
                            <img 
                              src={equipment.image_url}
                              alt={`${equipment.brand} ${equipment.model}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div 
                              className="w-full h-full bg-muted rounded flex items-center justify-center text-xs font-medium text-muted-foreground"
                              style={{ display: 'none' }}
                            >
                              <span>{equipment.brand.slice(0, 2)}</span>
                            </div>
                          </div>
                          
                          {/* Equipment name on hover */}
                          {isHoveredAccessory && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {equipment.brand} {equipment.model}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Trending badge */}
            {bag.isTrending && (
              <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                🔥 Trending
              </div>
            )}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/70 backdrop-blur-[8px] border-t border-white/10">
              <div className="flex items-end justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{bag.owner}</h3>
                  <p className="text-gray-300 text-xs truncate">{bag.title}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getHandicapBadgeColor(bag.handicap)}`}>
                    {bag.handicap} HCP
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-primary font-bold text-sm">
                  ${bag.totalValue.toLocaleString()}
                </span>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLikeClick}
                    className="flex items-center gap-1 text-xs text-gray-300 hover:text-primary transition-colors duration-200"
                  >
                    <Heart className={`w-3 h-3 ${bag.isLiked ? 'fill-primary text-primary' : ''}`} />
                    {bag.likeCount}
                  </button>
                  
                  <button
                    onClick={handleFollowClick}
                    className="flex items-center gap-1 text-xs text-gray-300 hover:text-primary transition-colors duration-200"
                  >
                    <UserPlus className={`w-3 h-3 ${bag.isFollowing ? 'fill-primary text-primary' : ''}`} />
                    {bag.followerCount}
                  </button>
                  
                  <span className="text-gray-400 text-xs">
                    {bag.clubCount} clubs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AspectRatio>
      </div>

      {/* Equipment Detail Modal */}
      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={equipmentModalOpen}
        onClose={() => setEquipmentModalOpen(false)}
      />
    </>
  );
};

export default BagCompositeCard;