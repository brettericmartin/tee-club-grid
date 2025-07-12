import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Heart, Share2, Edit, ArrowLeft, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";
import { BagGalleryDndKit } from "@/components/bag/BagGalleryDndKit";
import { bagLayoutsService, type BagLayout } from "@/services/bagLayouts";

const BagDisplayStyled = () => {
  const { bagId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bagData, setBagData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [layout, setLayout] = useState<BagLayout>({});
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [totalTees, setTotalTees] = useState(0);

  useEffect(() => {
    if (bagId) {
      loadBag();
    }
  }, [bagId]);

  const calculateTotalTees = async (userId: string) => {
    try {
      // Count tees from bags
      const { count: bagTees } = await supabase
        .from('bag_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // Count tees from posts (if feed_posts table exists)
      const { count: postTees } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', 
          supabase
            .from('feed_posts')
            .select('id')
            .eq('user_id', userId)
        )
        .single() ?? { count: 0 };
      
      const total = (bagTees || 0) + (postTees || 0);
      setTotalTees(total);
    } catch (error) {
      console.error('Error calculating total tees:', error);
      // For now, just use bag likes count as fallback
      setTotalTees(bagData?.likes_count || 0);
    }
  };
  
  const loadBag = async () => {
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
        .eq('id', bagId)
        .single();

      if (error) throw error;
      setBagData(data);

      // Load layout data
      const loadedLayout = await bagLayoutsService.loadLayout(bagId!);
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
          .eq('bag_id', bagId)
          .eq('user_id', currentUser.id)
          .single();
        
        setIsLiked(!!likeData);
      }
      
      // Calculate total tees for this user across all content
      if (data?.user_id) {
        await calculateTotalTees(data.user_id);
      }
    } catch (err: any) {
      console.error('Error loading bag:', err);
      toast.error('Failed to load bag');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('Please sign in to like bags');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('bag_likes')
          .delete()
          .eq('bag_id', bagId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('bag_likes')
          .insert({
            bag_id: bagId,
            user_id: currentUser.id
          });
      }
      setIsLiked(!isLiked);
      toast.success(isLiked ? 'Removed from likes' : 'Added to likes');
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleLayoutChange = (newLayout: BagLayout) => {
    setLayout(newLayout);
  };

  const handleSaveLayout = async () => {
    if (!bagId) return;

    const success = await bagLayoutsService.saveLayout(bagId, layout);
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
          <Button onClick={() => navigate('/bags')} variant="outline">
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-[10px] border-b border-white/10 sticky top-16 z-40">
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
              <h1 className="text-2xl font-bold text-white">{bagData.name}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="bg-white/10 rounded-lg p-1 flex">
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

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                className={`${isLiked ? 'text-red-500' : 'text-white'} hover:bg-white/10`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Share2 className="w-5 h-5" />
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
        {/* Owner Info */}
        <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-6 mb-8 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
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
                {totalTees.toLocaleString()}
              </p>
              <p className="text-white/70">Total Tees</p>
            </div>
          </div>
          
          {bagData.description && (
            <p className="mt-4 text-white/80">{bagData.description}</p>
          )}
        </div>

        {/* Equipment Display */}
        {viewMode === 'gallery' ? (
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
                        className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:bg-white/[0.15] transition-colors cursor-pointer"
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

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{bagData.bag_equipment?.length || 0}</p>
            <p className="text-white/70 text-sm">Total Items</p>
          </div>
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{bagData.likes_count || 0}</p>
            <p className="text-white/70 text-sm">Bag Tees</p>
          </div>
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{bagData.views_count || 0}</p>
            <p className="text-white/70 text-sm">Views</p>
          </div>
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {bagData.bag_equipment?.filter((i: any) => i.is_featured).length || 0}
            </p>
            <p className="text-white/70 text-sm">Featured</p>
          </div>
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 text-center">
            <p className="text-xl font-medium text-white/80">
              ${totalValue.toLocaleString()}
            </p>
            <p className="text-white/70 text-xs">Est. Value</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BagDisplayStyled;