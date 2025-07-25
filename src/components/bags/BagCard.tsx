import { useState, memo, useEffect } from 'react';
import { TrendingUp, Star, UserPlus, UserMinus, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getBrandAbbreviation } from '@/utils/brandAbbreviations';
import { cn } from '@/lib/utils';
import { EquipmentShowcaseModal } from '@/components/EquipmentShowcaseModal';
import EquipmentTile from '@/components/shared/EquipmentTile';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import type { Database } from '@/lib/supabase';
import { formatCompactCurrency } from '@/lib/formatters';

interface BagEquipmentItem {
  id: string;
  bag_id: string;
  equipment_id: string;
  is_featured: boolean;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  custom_specs?: Record<string, any>;
  custom_photo_url?: string;
  created_at: string;
  equipment: {
    id: string;
    brand: string;
    model: string;
    category: string;
    image_url?: string;
    msrp?: number;
    specs?: Record<string, any>;
    popularity_score?: number;
    release_date?: string;
    created_at: string;
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
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
      handicap?: number;
      title?: string;
    };
    bag_equipment?: BagEquipmentItem[];
  };
  onView: (bagId: string) => void;
  onLike?: (bagId: string) => void;
  onFollow?: (userId: string, username: string) => void;
  isLiked?: boolean;
  isFollowing?: boolean;
  currentUserId?: string;
}

const BagCardComponent = ({ 
  bag, 
  onView, 
  onLike, 
  onFollow, 
  isLiked = false, 
  isFollowing = false,
  currentUserId 
}: BagCardProps) => {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [selectedBagEquipment, setSelectedBagEquipment] = useState<BagEquipmentItem | null>(null);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Define club categories
  const CLUB_CATEGORIES = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
  const ACCESSORY_CATEGORIES = ['ball', 'glove', 'rangefinder', 'gps', 'tee', 'towel', 'ball_marker', 'divot_tool', 'accessories', 'shaft', 'grip'];
  const COMPONENT_CATEGORIES = ['shaft', 'grip']; // New category for club components
  
  // Find the actual golf bag equipment
  const allEquipment = bag.bag_equipment || [];
  const golfBag = allEquipment.find(item => 
    item.equipment && item.equipment.category === 'bag'
  );
  
  // Get the golf bag image
  const golfBagImage = golfBag?.custom_photo_url || golfBag?.equipment?.image_url;
  
  // Separate clubs and accessories
  const clubs = allEquipment.filter(item => 
    item.equipment && CLUB_CATEGORIES.includes(item.equipment.category)
  );
  const accessories = allEquipment.filter(item => 
    item.equipment && ACCESSORY_CATEGORIES.includes(item.equipment.category)
  );
  
  // If bag is featured and there are less than 6 featured clubs, include it in clubs
  const featuredClubs = clubs.filter(item => item.is_featured);
  const shouldIncludeBagInClubs = golfBag?.is_featured && featuredClubs.length < 6;
  
  // Ensure golf bag is only added once
  if (golfBag) {
    if (shouldIncludeBagInClubs) {
      // Only add to clubs if it's not already there
      if (!clubs.find(item => item.id === golfBag.id)) {
        clubs.push(golfBag);
      }
    } else {
      // Only add to accessories if it's not already there
      if (!accessories.find(item => item.id === golfBag.id)) {
        accessories.push(golfBag);
      }
    }
  }
  
  // Sort by featured first, then by creation date
  const sortEquipment = (items: BagEquipmentItem[]) => 
    items.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  
  // Get 6 items for main grid (3x2) - clubs and possibly featured bag
  const displayClubs = sortEquipment([...clubs]).slice(0, 6);
  
  // Get 4 accessories for bottom row
  const displayAccessories = sortEquipment([...accessories]).slice(0, 4);
  
  // Calculate total value
  const totalValue = allEquipment.reduce((sum, item) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;
  
  const equipmentCount = allEquipment.length;

  const getEquipmentImage = (item: BagEquipmentItem) => {
    // Prioritize custom photo URL if available
    if (item.custom_photo_url && !imageError[`${item.id}-custom`]) {
      return item.custom_photo_url;
    }
    if (item.equipment?.image_url && !imageError[`${item.id}-equipment`]) {
      return item.equipment.image_url;
    }
    return null;
  };

  const handleEquipmentClick = (e: React.MouseEvent, item: BagEquipmentItem) => {
    e.stopPropagation(); // Prevent card click
    if (!item?.equipment) {
      console.error('Equipment data missing for item:', item);
      return;
    }
    setSelectedBagEquipment(item);
    setEquipmentModalOpen(true);
  };

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFollow || !bag.profiles?.id || !bag.profiles?.username) {
      return;
    }
    
    setFollowLoading(true);
    try {
      await onFollow(bag.profiles.id, bag.profiles.username);
    } catch (error) {
      console.error('Follow error in BagCard:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Don't show follow button if it's the current user's bag
  const showFollowButton = currentUserId && bag.profiles?.id && currentUserId !== bag.profiles.id;

  return (
    <>
      <Card 
      className="group relative overflow-hidden transition-[transform,shadow] duration-300 hover:scale-[1.02] hover:shadow-2xl"
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
              loading="lazy"
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

      {/* Container - fully transparent to show background image */}
      <div 
        className="relative p-4 h-full min-h-[400px] cursor-pointer"
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
                {bag.profiles?.display_name || bag.profiles?.username || 'Unknown'} • {bag.name}
              </h3>
              {bag.profiles?.title && (
                <p className="text-xs text-white/70">
                  {bag.profiles.title}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Follow button */}
            {showFollowButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFollowClick}
                disabled={followLoading}
                className="bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#3a3a3a]"
              >
                {followLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-3 h-3 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
            
            {/* Trending badge */}
            {(bag.is_trending || bag.likes_count > 50) && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>
        </div>

        {/* 3x2 Clubs Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: 6 }).map((_, index) => {
            const item = displayClubs[index];
            const imageUrl = item ? getEquipmentImage(item) : null;
            
            return (
              <div key={index} className="relative group/item aspect-square">
                {item ? (
                  <>
                    <EquipmentTile
                      equipment={{
                        ...item.equipment,
                        image_url: imageUrl || undefined
                      }}
                      size="lg"
                      showPhotoCount={false}
                      className="w-full h-full"
                      onClick={(e) => handleEquipmentClick(e, item)}
                    />
                    
                    {/* Featured indicator */}
                    {item.is_featured && (
                      <div className="absolute top-1 right-1 z-10">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    )}
                    
                    {/* Hover overlay with equipment name */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-lg z-20 pointer-events-none">
                      <p className="text-white text-xs text-center line-clamp-2">
                        {item.equipment?.brand} {item.equipment?.model}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="aspect-square rounded-lg bg-[#1a1a1a]" />
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
              <div key={`acc-${index}`} className="relative group/item">
                {item ? (
                  <>
                    <EquipmentTile
                      equipment={{
                        ...item.equipment,
                        image_url: imageUrl || undefined
                      }}
                      size="sm"
                      showPhotoCount={false}
                      className="w-full h-full"
                      onClick={(e) => handleEquipmentClick(e, item)}
                    />
                    
                    {/* Hover overlay with equipment name */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-lg z-20 pointer-events-none">
                      <p className="text-white text-[10px] text-center line-clamp-2">
                        {item.equipment?.brand} {item.equipment?.model}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="aspect-square rounded-lg bg-[#1a1a1a]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="flex items-center gap-4 text-white/90 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{equipmentCount}</span>
              <span className="text-xs text-white/70">pieces</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{formatCompactCurrency(totalValue)}</span>
              <span className="text-xs text-white/70">value</span>
            </div>
          </div>
          
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* View Bag Button - Left side, smaller */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onView(bag.id);
              }}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#3a3a3a] group h-9 text-sm"
            >
              <span>View Full Bag</span>
              <ExternalLink className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            {/* Tee Button - Right side, prominent */}
            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-md hover:bg-[#3a3a3a] transition-colors">
              <TeedBallLike
                isLiked={isLiked}
                likeCount={bag.likes_count || 0}
                onToggle={() => onLike?.(bag.id)}
                size="md"
                showCount={true}
                className="text-white hover:text-primary h-9 px-3"
              />
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
};

// Custom comparison function to prevent unnecessary re-renders
const areEqual = (prevProps: BagCardProps, nextProps: BagCardProps) => {
  return (
    prevProps.bag.id === nextProps.bag.id &&
    prevProps.bag.likes_count === nextProps.bag.likes_count &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isFollowing === nextProps.isFollowing &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.bag.bag_equipment?.length === nextProps.bag.bag_equipment?.length
  );
};

export const BagCard = memo(BagCardComponent, areEqual);