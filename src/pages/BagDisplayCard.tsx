import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Heart, Share2, Edit, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment-categories";
import BagStatsRow from "@/components/bag/BagStatsRow";
import { BagCard } from "@/components/bags/BagCard";
import BagEquipmentGallery from "@/components/bag/BagEquipmentGallery";
import { BadgeDisplay } from "@/components/badges/BadgeDisplay";
import { BadgeService } from "@/services/badgeService";
import type { Database } from "@/lib/supabase";

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'] & {
    equipment_photos?: Array<{
      photo_url: string;
      likes_count: number;
      is_primary: boolean;
    }>;
    most_liked_photo?: string;
    primaryPhoto?: string;
  };
};

type BagData = Database['public']['Tables']['user_bags']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
  bag_equipment?: BagEquipmentItem[];
};

const BagDisplayCard = () => {
  const { bagId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bagData, setBagData] = useState<BagData | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [totalTees, setTotalTees] = useState(0);
  const [userBadges, setUserBadges] = useState<any[]>([]);

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
            equipment (
              *,
              equipment_photos (
                photo_url,
                likes_count,
                is_primary
              )
            )
          )
        `)
        .eq('id', bagId)
        .single();

      if (error) throw error;
      
      // Process equipment photos to add most_liked_photo and primaryPhoto
      const processedData = {
        ...data,
        bag_equipment: data.bag_equipment?.map(item => ({
          ...item,
          equipment: {
            ...item.equipment,
            equipment_photos: item.equipment.equipment_photos || [],
            most_liked_photo: item.equipment.equipment_photos?.sort((a, b) => 
              (b.likes_count || 0) - (a.likes_count || 0)
            )[0]?.photo_url || null,
            primaryPhoto: item.equipment.equipment_photos?.sort((a, b) => 
              (b.likes_count || 0) - (a.likes_count || 0)
            )[0]?.photo_url || item.equipment.image_url
          }
        }))
      };
      
      setBagData(processedData);

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
        
        // Load user badges
        const badges = await BadgeService.getUserFeaturedBadges(data.user_id, 6);
        setUserBadges(badges);
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


  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900/95 border-b border-white/10 sticky top-16 z-40">
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
                {bagData.profiles?.display_name || bagData.profiles?.username || 'Unknown'}: {bagData.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
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
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats + Bag Card + Badges Row - Centered */}
        <div className="flex justify-center">
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
            
            {/* Badges - 2x3 grid on right */}
            <div className="flex-shrink-0 w-full lg:w-56">
              <div className="h-full bg-gray-900/50 rounded-lg p-4 border border-white/10">
                <BadgeDisplay
                  badges={userBadges}
                  size="lg"
                  showEmpty={true}
                  maxDisplay={6}
                  onBadgeClick={(badge) => {
                    // TODO: Show badge details modal
                    console.log('Badge clicked:', badge);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Gallery */}
        <BagEquipmentGallery
          bagEquipment={bagData.bag_equipment || []}
          onEquipmentClick={(item) => navigate(`/equipment/${item.equipment.id}`)}
        />
      </div>
    </div>
  );
};

export default BagDisplayCard;