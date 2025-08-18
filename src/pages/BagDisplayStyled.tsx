import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Share2, Edit, ArrowLeft, Grid3x3, List, CreditCard, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";
import { BagGalleryDndKit } from "@/components/bag/BagGalleryDndKit";
import { bagLayoutsService, type BagLayout } from "@/services/bagLayouts";
import BagStatsRow from "@/components/bag/BagStatsRow";
import { BagCard } from "@/components/bags/BagCard";
import BagEquipmentGallery from "@/components/bag/BagEquipmentGallery";
import { BadgeDisplay } from "@/components/badges/BadgeDisplay";
import { BadgeService } from "@/services/badgeService";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/formatters";
import { sortBadgesByPriority } from "@/utils/badgeSorting";
import BackgroundLayer from "@/components/BackgroundLayer";
import { TeedBallLike } from "@/components/shared/TeedBallLike";
import { toggleBagLike } from "@/services/bags";
import ShareModal from "@/components/bag/ShareModal";

const BagDisplayStyled = () => {
  const { bagId, username, bagname } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bagData, setBagData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'gallery' | 'list'>('card');
  const [layout, setLayout] = useState<BagLayout>({});
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [totalTees, setTotalTees] = useState(0);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [actualBagId, setActualBagId] = useState<string | null>(null);

  useEffect(() => {
    if (username && bagname) {
      // Load bag by username and bagname
      loadBagByUserAndName();
    } else if (bagId) {
      // Load bag by UUID
      setActualBagId(bagId);
      loadBag(bagId);
    }
  }, [bagId, username, bagname]);

  const calculateTotalTees = async (userId: string) => {
    try {
      // Count tees from bags
      const { count: bagTees } = await supabase
        .from('bag_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // First get the user's post IDs
      const { data: userPosts } = await supabase
        .from('feed_posts')
        .select('id')
        .eq('user_id', userId);
      
      // Count tees from posts if they have any
      let postTees = 0;
      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(post => post.id);
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);
        postTees = count || 0;
      }
      
      const total = (bagTees || 0) + postTees;
      setTotalTees(total);
    } catch (error) {
      console.error('Error calculating total tees:', error);
      // For now, just use bag likes count as fallback
      setTotalTees(bagData?.likes_count || 0);
    }
  };
  
  const loadBagByUserAndName = async () => {
    try {
      setLoading(true);
      
      // First get the user by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      
      if (profileError) throw profileError;
      
      // Generate a slug from the bag name for comparison
      const bagSlug = bagname?.toLowerCase().replace(/\s+/g, '-');
      
      // Find the bag by user and name
      const { data: bags, error: bagError } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles (*),
          bag_equipment (
            *,
            equipment (*)
          )
        `)
        .eq('user_id', profile.id);
      
      if (bagError) throw bagError;
      
      // Find the bag with matching name (compare slugified versions)
      const bag = bags?.find(b => 
        b.name.toLowerCase().replace(/\s+/g, '-') === bagSlug ||
        b.name === bagname
      );
      
      if (!bag) {
        throw new Error('Bag not found');
      }
      
      setActualBagId(bag.id);
      setBagData(bag);
      await loadBagExtras(bag.id, bag);
    } catch (error) {
      console.error('Error loading bag by username/name:', error);
      toast.error('Failed to load bag');
      setLoading(false);
    }
  };

  const loadBag = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles (*),
          bag_equipment (
            *,
            equipment (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setBagData(data);
      await loadBagExtras(id, data);
    } catch (err: any) {
      console.error('Error loading bag:', err);
      toast.error('Failed to load bag');
      setLoading(false);
    }
  };
  
  const loadBagExtras = async (id: string, data: any) => {
    try {
      // Load layout data
      const loadedLayout = await bagLayoutsService.loadLayout(id);
      if (loadedLayout) {
        setLayout(loadedLayout);
      } else if (data?.bag_equipment) {
        // Generate default layout if none exists
        const defaultLayout = bagLayoutsService.generateDefaultLayout(
          data.bag_equipment.map((item: any) => ({
            id: item.equipment_id,
            category: item.equipment.category
          }))
        );
        setLayout(defaultLayout);
      }

      // Check if user has liked this bag
      if (currentUser) {
        const { data: likeData } = await supabase
          .from('bag_likes')
          .select('id')
          .eq('bag_id', id)
          .eq('user_id', currentUser.id)
          .single();
        
        setIsLiked(!!likeData);
      }
      
      // Calculate total tees for this user across all content
      if (data?.user_id) {
        await calculateTotalTees(data.user_id);
        
        // Load user badges
        const badges = await BadgeService.getUserBadges(data.user_id);
        setUserBadges(badges);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('Please sign in to tee bags');
      return;
    }

    const idToUse = actualBagId || bagId;
    if (!idToUse) return;

    try {
      const newLikedState = await toggleBagLike(currentUser.id, idToUse);
      setIsLiked(newLikedState);
      // Update local likes count
      setBagData((prev: any) => ({
        ...prev,
        likes_count: newLikedState ? (prev.likes_count || 0) + 1 : Math.max(0, (prev.likes_count || 0) - 1)
      }));
    } catch (error) {
      console.error('Error toggling bag like:', error);
      toast.error('Failed to update tee');
    }
  };

  const handleLayoutChange = (newLayout: BagLayout) => {
    setLayout(newLayout);
  };

  const handleSaveLayout = async () => {
    const idToUse = actualBagId || bagId;
    if (!idToUse) return;

    const success = await bagLayoutsService.saveLayout(idToUse, layout);
    if (success) {
      toast.success('Layout saved successfully!');
      setIsEditingLayout(false);
    } else {
      toast.error('Failed to save layout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!bagData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Bag not found</h2>
          <Button onClick={() => navigate('/bags-browser')} variant="outline">
            Browse Bags
          </Button>
        </div>
      </div>
    );
  }

  const isOwnBag = currentUser?.id === bagData.user_id;
  const totalValue = bagData.bag_equipment?.reduce((sum: number, item: any) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;

  // Group equipment by category
  const equipmentByCategory = bagData.bag_equipment?.reduce((acc: any, item: any) => {
    const category = item.equipment?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {}) || {};

  const categoryOrder = Object.values(EQUIPMENT_CATEGORIES);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background Layer */}
      <BackgroundLayer backgroundId={bagData.background_image || 'midwest-lush'} />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-white">
                {viewMode === 'card' 
                  ? `${bagData.profiles?.display_name || bagData.profiles?.username || 'Unknown'}: ${bagData.name}`
                  : bagData.name
                }
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="bg-[#2a2a2a] rounded-lg p-1 flex">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={viewMode === 'card' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                >
                  <CreditCard className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'gallery' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('gallery')}
                  className={viewMode === 'gallery' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-[#2a2a2a] border border-white/20 rounded-md hover:bg-[#3a3a3a] transition-colors">
                <TeedBallLike
                  isLiked={isLiked}
                  likeCount={bagData?.likes_count || 0}
                  onToggle={handleLike}
                  size="md"
                  showCount={true}
                  className="text-white hover:text-primary h-10 px-3"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowShareModal(true)}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              {isOwnBag && viewMode === 'gallery' && (
                <Button
                  onClick={() => setIsEditingLayout(!isEditingLayout)}
                  variant={isEditingLayout ? 'destructive' : 'outline'}
                  className={isEditingLayout ? '' : 'text-white border-white/20 hover:bg-white/10'}
                >
                  {isEditingLayout ? 'Cancel Edit' : 'Edit Layout'}
                </Button>
              )}
              {isOwnBag && (
                <Button
                  onClick={() => navigate('/my-bag')}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Bag
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Owner Info - hide in card view since it's in the BagCard */}
        {viewMode !== 'card' && (
          <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-6 mb-8 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={bagData.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {bagData.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {bagData.profiles?.display_name || bagData.profiles?.username}
                  </h2>
                  <p className="text-white/70">@{bagData.profiles?.username}</p>
                  {bagData.profiles?.handicap !== null && (
                    <Badge variant="outline" className="mt-2 bg-primary/20 text-primary border-primary/30">
                      {bagData.profiles.handicap > 0 ? '+' : ''}{bagData.profiles.handicap} Handicap
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  {formatCompactNumber(totalTees)}
                </p>
                <p className="text-white/70">Total Tees</p>
              </div>
            </div>
            
            {bagData.description && (
              <p className="mt-4 text-white/80">{bagData.description}</p>
            )}
          </div>
        )}

        {/* Equipment Display */}
        {viewMode === 'card' ? (
          /* Card View */
          <>
            <div className="flex justify-center mb-8">
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Stats - 1 column on left */}
                <div className="flex-shrink-0 w-full lg:w-56">
                  <div className="h-full bg-gray-900/50 rounded-lg p-4 border border-white/10">
                    <BagStatsRow
                      totalItems={bagData.bag_equipment?.length || 0}
                      bagTees={bagData.likes_count || 0}
                      views={bagData.views_count || 0}
                      estimatedValue={totalValue}
                    />
                  </div>
                </div>
                
                {/* Bag Card - center */}
                <div className="flex-shrink-0 w-full max-w-sm">
                  <BagCard
                    bag={bagData}
                    onView={() => {}} // Already on bag page
                    onLike={handleLike}
                    onFollow={async (userId: string) => {
                      // TODO: Implement follow functionality
                      console.log('Follow user:', userId);
                    }}
                    isLiked={isLiked}
                    isFollowing={false} // TODO: Check following status
                    currentUserId={currentUser?.id}
                  />
                </div>
                
                {/* Badges - 2x4 grid on right */}
                <div className="flex-shrink-0 w-full lg:w-56">
                  <div className="h-full bg-gray-900/50 rounded-lg p-4 border border-white/10">
                    <div className="grid grid-cols-2 gap-3">
                      {sortBadgesByPriority(userBadges.filter(ub => ub.progress === 100)).slice(0, 8).map((userBadge) => {
                        const rarity = userBadge.badge?.rarity || 'common';
                        const badgeIcon = userBadge.badge?.icon;
                        const isImageUrl = badgeIcon?.startsWith('/') || badgeIcon?.startsWith('http');
                        
                        return (
                          <div
                            key={userBadge.id}
                            className="relative group"
                          >
                            <div
                              className="relative flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden w-24 h-24 hover:scale-110"
                              onClick={() => {
                                // TODO: Show badge details modal
                                console.log('Badge clicked:', userBadge);
                              }}
                            >
                              {isImageUrl ? (
                                <img 
                                  src={badgeIcon}
                                  alt={userBadge.badge?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl">{badgeIcon || '🏅'}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Fill empty slots */}
                      {Array.from({ length: Math.max(0, 8 - Math.min(8, userBadges.filter(ub => ub.progress === 100).length)) }).map((_, index) => (
                        <div
                          key={`empty-${index}`}
                          className="w-24 h-24 flex items-center justify-center"
                        >
                          <Trophy className="w-10 h-10 text-gray-700" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Badge count stat */}
                    <div className="col-span-2 mt-4 text-center border-t border-white/10 pt-3">
                      <p className="text-2xl font-bold text-white">{userBadges.filter(ub => ub.progress === 100).length}</p>
                      <p className="text-sm text-white/70">Badges Earned</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment Gallery below card layout */}
            <BagEquipmentGallery
              bagEquipment={bagData.bag_equipment || []}
              onEquipmentClick={(item) => navigate(`/equipment/${item.equipment.id}`)}
            />
          </>
        ) : viewMode === 'gallery' ? (
          <BagGalleryDndKit
            bagEquipment={bagData.bag_equipment || []}
            layout={layout}
            isEditing={isEditingLayout}
            isOwnBag={isOwnBag}
            onLayoutChange={handleLayoutChange}
            onSaveLayout={handleSaveLayout}
          />
        ) : (
          <div className="space-y-8">
            {categoryOrder.map(category => {
              const items = equipmentByCategory[category];
              if (!items || items.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {CATEGORY_DISPLAY_NAMES[category as keyof typeof CATEGORY_DISPLAY_NAMES] || category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                        onClick={() => navigate(`/equipment/${item.equipment.id}`)}
                      >
                        <div className="flex items-start gap-4">
                          {item.equipment.image_url && (
                            <img
                              src={item.equipment.image_url}
                              alt={`${item.equipment.brand} ${item.equipment.model}`}
                              className="w-20 h-20 object-contain bg-white/5 rounded-lg"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">
                              {item.equipment.brand}
                            </h4>
                            <p className="text-white/70 text-sm">
                              {item.equipment.model}
                            </p>
                            <p className="text-primary font-semibold mt-2">
                              ${item.purchase_price || item.equipment.msrp || 0}
                            </p>
                            {item.is_featured && (
                              <Badge className="mt-2 bg-primary/20 text-primary border-0">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                        {item.notes && (
                          <p className="mt-3 text-white/60 text-sm">{item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats - only show for non-card views */}
        {viewMode !== 'card' && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{bagData.bag_equipment?.length || 0}</p>
              <p className="text-white/70 text-sm">Total Items</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{bagData.likes_count || 0}</p>
              <p className="text-white/70 text-sm">Bag Tees</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{bagData.views_count || 0}</p>
              <p className="text-white/70 text-sm">Views</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {bagData.bag_equipment?.filter((i: any) => i.is_featured).length || 0}
              </p>
              <p className="text-white/70 text-sm">Featured</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-4 text-center">
              <p className="text-xl font-medium text-white/80">
                {formatCompactCurrency(totalValue)}
              </p>
              <p className="text-white/70 text-xs">Est. Value</p>
            </div>
          </div>
        )}
        
        {/* Share Button - Bottom of Page */}
        <div className="mt-12 mb-8">
          <Button
            onClick={() => setShowShareModal(true)}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-black font-semibold py-6 text-lg rounded-xl shadow-lg"
          >
            <Share2 className="w-5 h-5" />
            Share This Bag
          </Button>
        </div>
      </div>
      </div>
      
      {/* Share Modal */}
      {bagData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          bag={bagData}
        />
      )}
    </div>
  );
};

export default BagDisplayStyled;