import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, Heart, Share2, ShoppingCart, Users, ChevronLeft, ChevronRight, Expand, Info, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PhotoLightbox } from '@/components/shared/PhotoLightbox';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { formatCompactCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  shaft?: Equipment;
  grip?: Equipment;
};

interface ViewerEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagEquipment: BagEquipment | null;
  bagOwner?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    handicap?: number;
  };
}

export function ViewerEquipmentModal({
  isOpen,
  onClose,
  bagEquipment,
  bagOwner
}: ViewerEquipmentModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [showLightbox, setShowLightbox] = useState(false);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const equipment = bagEquipment?.equipment;
  const equipmentId = equipment?.id;

  const loadAdditionalData = useCallback(async () => {
    if (!equipmentId) return;
    
    // Prevent duplicate loading using ref
    if (loadingRef.current) return;
    loadingRef.current = true;

    setLoading(true);
    try {
      // Load other users with this equipment
      const { data: bags } = await supabase
        .from('bag_equipment')
        .select(`
          id,
          user_bags!inner(
            user_id,
            profiles!inner(
              id,
              username,
              display_name,
              avatar_url,
              handicap
            )
          )
        `)
        .eq('equipment_id', equipmentId)
        .neq('user_bags.user_id', bagOwner?.id || '')
        .limit(5);

      if (bags) {
        const uniqueUsers = Array.from(new Map(
          bags.map(b => [b.user_bags.profiles.id, b.user_bags.profiles])
        ).values());
        setOtherUsers(uniqueUsers);
      }

      // Check if wishlisted
      if (user) {
        const { data: wishlist } = await supabase
          .from('equipment_wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('equipment_id', equipmentId)
          .single();

        setIsWishlisted(!!wishlist);
      }
    } catch (error) {
      console.error('Error loading additional data:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [equipmentId, bagEquipment?.custom_photo_url, equipment?.image_url, bagOwner?.id, user?.id]);

  // Load additional data when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Clear state when modal closes
      loadingRef.current = false;
      return;
    }
    
    if (equipmentId) {
      loadAdditionalData();
    }
  }, [isOpen, equipmentId, loadAdditionalData]);

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to save items');
      return;
    }

    try {
      if (isWishlisted) {
        await supabase
          .from('equipment_wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('equipment_id', equipmentId);
        
        toast.success('Removed from wishlist');
      } else {
        await supabase
          .from('equipment_wishlist')
          .insert({
            user_id: user.id,
            equipment_id: equipmentId
          });
        
        toast.success('Added to wishlist');
      }
      setIsWishlisted(!isWishlisted);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/equipment/${equipmentId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handlePhotoLike = async (photoId: string, isLiked: boolean) => {
    // Implement photo like functionality if needed
    console.log('Photo like:', photoId, isLiked);
  };

  if (!equipment || !bagEquipment) return null;

  // Determine main display photo - use primaryPhoto if available (set by loadBagEquipment)
  const mainPhoto = bagEquipment.custom_photo_url || (equipment as any)?.primaryPhoto || equipment.image_url || '';
  const hasValidMainPhoto = mainPhoto && !mainPhoto.includes('placehold');

  // Check if it's a club (for showing shaft/grip)
  const isClub = ['driver', 'fairway_wood', 'wood', 'woods', 'hybrid', 'utility_iron', 
                  'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters'].includes(equipment.category);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden" hideCloseButton={true}>
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {equipment.brand} {equipment.model}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {equipment.category.replace(/_/g, ' ')} • {equipment.release_year || 'N/A'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)]">
            <div className="px-6 pb-6 space-y-6">
              {/* Main Image Section */}
              <div className="relative">
                <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl">
                  {hasValidMainPhoto ? (
                    <>
                      <img
                        src={mainPhoto}
                        alt={`${equipment.brand} ${equipment.model}`}
                        className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
                        onClick={() => setShowLightbox(true)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setShowLightbox(true)}
                      >
                        <Expand className="h-5 w-5" />
                      </Button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Camera className="h-16 w-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No photo available</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Simplified: No photo thumbnails for user's bag view */}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isWishlisted ? "default" : "outline"}
                  size="sm"
                  onClick={toggleWishlist}
                >
                  <Heart className={cn("h-4 w-4 mr-2", isWishlisted && "fill-current")} />
                  {isWishlisted ? "Saved" : "Save to Wishlist"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${equipmentId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyShareLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              <Separator />

              {/* Equipment Details */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Specifications */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Equipment Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Brand</span>
                      <span className="font-medium">{equipment.brand}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{equipment.model}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium capitalize">
                        {equipment.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {equipment.release_year && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Year</span>
                        <span className="font-medium">{equipment.release_year}</span>
                      </div>
                    )}
                    {equipment.msrp && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">MSRP</span>
                        <span className="font-medium text-primary">
                          {formatCompactCurrency(equipment.msrp)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Build Configuration */}
                {isClub && (bagEquipment.shaft || bagEquipment.grip || bagEquipment.custom_specs) && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Custom Build</h3>
                    <div className="space-y-3">
                      {bagEquipment.shaft && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Shaft</p>
                          <p className="font-medium">
                            {bagEquipment.shaft.brand} {bagEquipment.shaft.model}
                          </p>
                        </div>
                      )}
                      {bagEquipment.grip && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Grip</p>
                          <p className="font-medium">
                            {bagEquipment.grip.brand} {bagEquipment.grip.model}
                          </p>
                        </div>
                      )}
                      {bagEquipment.custom_specs?.loft && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Loft</p>
                          <p className="font-medium">{bagEquipment.custom_specs.loft}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Owner's Notes */}
              {bagEquipment.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Owner's Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {bagEquipment.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Social Proof */}
              {otherUsers.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Also Used By
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {otherUsers.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => navigate(`/@${profile.username}`)}
                          className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>
                              {profile.display_name?.[0] || profile.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              {profile.display_name || profile.username}
                            </p>
                            {profile.handicap !== null && profile.handicap !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {profile.handicap > 0 ? '+' : ''}{profile.handicap} HCP
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Bag Owner Info */}
              {bagOwner && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={bagOwner.avatar_url} />
                        <AvatarFallback>
                          {bagOwner.display_name?.[0] || bagOwner.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {bagOwner.display_name || bagOwner.username}'s Equipment
                        </p>
                        {bagOwner.handicap !== null && bagOwner.handicap !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            {bagOwner.handicap > 0 ? '+' : ''}{bagOwner.handicap} handicap
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/@${bagOwner.username}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox - Single photo only */}
      <PhotoLightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        photos={hasValidMainPhoto ? [{
          id: 'main',
          photo_url: mainPhoto,
          caption: `${equipment.brand} ${equipment.model}`
        }] : []}
        initialPhotoIndex={0}
        onLike={handlePhotoLike}
        showLikes={false}
      />
    </>
  );
}

export default React.memo(ViewerEquipmentModal);