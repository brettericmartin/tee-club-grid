import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Eye, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FeedItemData } from '@/services/feed';

// Helper functions
export const getPostTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'bag_photo': 'Bag Photo',
    'new_equipment': 'New Equipment',
    'equipment_showcase': 'Equipment Showcase',
    'tournament_prep': 'Tournament Prep'
  };
  return labels[type] || 'Post';
};

export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};
import { Button } from '@/components/ui/button';
import EquipmentDetailModal from './EquipmentDetailModal';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];

interface FeedItemCardProps {
  item: FeedItemData;
  onLike?: (postId: string) => void;
  onFollow?: (userId: string) => void;
}

export const FeedItemCard = ({ item, onLike, onFollow }: FeedItemCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(item.isFromFollowed);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [equipmentData, setEquipmentData] = useState<Record<string, Equipment>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.type === 'new_equipment' && item.bagData?.featuredClubs) {
      loadEquipmentData();
    }
  }, [item]);

  const loadEquipmentData = async () => {
    if (!item.bagData?.featuredClubs) return;
    
    setLoading(true);
    const equipmentMap: Record<string, Equipment> = {};

    // Fetch equipment directly by IDs since we're now using real equipment IDs
    const { data: equipmentList } = await supabase
      .from('equipment')
      .select('*')
      .in('id', item.bagData.featuredClubs);

    if (equipmentList) {
      equipmentList.forEach(eq => {
        equipmentMap[eq.id] = eq;
      });
    }

    setEquipmentData(equipmentMap);
    setLoading(false);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    onLike?.(item.postId);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    onFollow?.(item.userId);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleEquipmentClick = (e: React.MouseEvent, equipmentId: string) => {
    e.stopPropagation();
    const equipment = equipmentData[equipmentId];
    if (equipment) {
      // Convert to equipment detail format for modal
      const equipmentDetail = {
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model,
        category: equipment.category,
        specs: equipment.specs || {},
        msrp: Number(equipment.msrp) || 0,
        description: equipment.description || "Professional golf equipment",
        features: equipment.features || [],
        images: [equipment.image_url || '/api/placeholder/400/400'],
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
          totalPrice: Number(equipment.msrp) || 0
        },
        isFeatured: false
      };
      setSelectedEquipment(equipmentDetail);
      setEquipmentModalOpen(true);
    }
  };

  // Get equipment details for featured items
  const featuredClubsData = item.bagData 
    ? item.bagData.featuredClubs
        .map(id => equipmentData[id])
        .filter(Boolean)
        .slice(0, 6)
    : [];

  // Handicap badge color based on skill level
  const getHandicapBadgeColor = (handicap: number) => {
    if (handicap <= 5) return "bg-primary text-primary-foreground";
    if (handicap <= 15) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
    <div 
      className="relative w-full aspect-[4/5] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleCardClick}
    >
      <div 
        className={`relative w-full h-full transition-transform duration-500 ease-luxury`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Side */}
        <div 
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full h-full">
            {/* Background Image */}
            <img 
              src={item.imageUrl} 
              alt={item.caption}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            
            {/* Top Section - User & Post Type */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={item.userAvatar} 
                  alt={item.userName}
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                />
                <div>
                  <p className="text-white font-medium text-sm">{item.userName}</p>
                  <p className="text-white/70 text-xs">{formatTimestamp(item.timestamp)}</p>
                </div>
              </div>
              
              {item.isFromFollowed && (
                <div className="px-2 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
                  <span className="text-primary text-xs font-medium">Following</span>
                </div>
              )}
            </div>

            {/* Post Type Badge */}
            <div className="absolute top-4 right-4">
              <div className="glass-card px-3 py-1 rounded-full">
                <span className="text-white text-xs font-medium">
                  {getPostTypeLabel(item.postType)}
                </span>
              </div>
            </div>

            {/* Bottom Section - Interactions */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white text-sm mb-3 line-clamp-2">{item.caption}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">{item.commentCount}</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border transition-all ${
                    isLiked 
                      ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{item.likes + (isLiked ? 1 : 0)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div 
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="relative w-full h-full">
            {/* Background Image */}
            <img 
              src={item.imageUrl} 
              alt={item.caption}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Featured clubs in 3x2 grid */}
            {item.bagData && featuredClubsData.length > 0 && !loading && (
              <div className="absolute top-[8%] left-[8%] right-[8%] bottom-[35%]">
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
                        <div className="glass-card w-full aspect-square rounded-lg p-2 transition-all duration-200 hover:scale-105 hover:shadow-2xl">
                          <div className="w-full h-full">
                            <img 
                              src={equipment.image_url || '/api/placeholder/150/150'}
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
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 glass-card px-3 py-1.5 rounded-full whitespace-nowrap">
                              <span className="text-white text-xs font-medium">
                                {equipment.brand} {equipment.model}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Loading state for equipment */}
            {item.bagData && loading && (
              <div className="absolute top-[8%] left-[8%] right-[8%] bottom-[35%] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              </div>
            )}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 glass-dark">
              <div className="flex items-end justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{item.userName}</h3>
                  <p className="text-white/70 text-xs truncate">Handicap: {item.userHandicap}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    size="sm"
                    onClick={handleFollow}
                    className={`flex items-center gap-1 text-xs ${isFollowing ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-primary hover:bg-primary/90 text-white'}`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                {item.bagData && (
                  <span className="text-primary font-bold text-sm">
                    ${item.bagData.totalValue.toLocaleString()}
                  </span>
                )}
                
                <div className="flex items-center gap-3">
                  <Link to={`/bag/${item.userId}`}>
                    <Button size="sm" className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20">
                      <Eye className="w-3 h-3" />
                      View Full Bag
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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