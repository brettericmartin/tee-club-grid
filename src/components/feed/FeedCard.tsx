import { useState, useEffect, memo } from 'react';
import { MessageCircle, Share2, RotateCcw, Clock, Plus, Camera, Trophy, User, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayName, getDisplayInitials } from '@/utils/displayName';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BagCard } from '@/components/bags/BagCard';
import { cn } from '@/lib/utils';
import { EquipmentShowcaseModal } from '@/components/EquipmentShowcaseModal';
import { toggleFollow } from '@/services/users';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { useNavigate } from 'react-router-dom';
import { getBagById } from '@/services/bags';

interface FeedCardProps {
  post: {
    id: string;
    user_id: string;
    type: 'new_equipment' | 'bag_update' | 'milestone' | 'playing' | 'equipment_photo';
    content?: {
      equipment_id?: string;
      equipment_name?: string;
      bag_id?: string;
      bag_name?: string;
      caption?: string;
      photo_url?: string;
      changes?: string[];
      total_value?: number;
      is_photo?: boolean;
    };
    // For equipment_photo posts, these are at the root level
    equipment_id?: string;
    bag_id?: string;
    media_urls?: string[];
    likes_count: number;
    created_at: string;
    profile?: {
      username: string;
      avatar_url?: string;
      handicap?: number;
    };
    profiles?: {
      username: string;
      display_name?: string;
      avatar_url?: string;
      handicap?: number;
    };
    equipment?: {
      brand: string;
      model: string;
    };
    bag?: any; // Full bag data from the join
  };
  onUpdate?: () => void;
}

export const FeedCard = memo(function FeedCard({ post, onUpdate }: FeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [userBagId, setUserBagId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBagLiked, setIsBagLiked] = useState(false);

  // Debug logging
  if (post.type === 'equipment_photo') {
    console.log('Equipment photo post:', post);
  }

  // Fetch user's bag for this post
  useEffect(() => {
    const fetchUserBag = async () => {
      // Only fetch if we don't have a specific bag_id
      if (post.user_id && !post.bag_id && !post.bag?.id) {
        // Get the user's most recent bag (not primary since that field might not exist)
        const { data } = await supabase
          .from('user_bags')
          .select('id, name')
          .eq('user_id', post.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          console.log('[FeedCard] Found user bag:', data.name, 'ID:', data.id);
          setUserBagId(data.id);
        }
      }
    };
    
    fetchUserBag();
  }, [post.user_id, post.bag_id]);

  // Check if following and if bag is liked
  useEffect(() => {
    const checkStatuses = async () => {
      if (user && post.user_id && user.id !== post.user_id) {
        const { data } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', post.user_id)
          .single();
        
        setIsFollowing(!!data);
      }
      
      // Check if bag is liked
      if (user && bagCardData?.id) {
        const { data } = await supabase
          .from('bag_tees')
          .select('id')
          .eq('user_id', user.id)
          .eq('bag_id', bagCardData.id)
          .single();
        
        setIsBagLiked(!!data);
      }
    };
    
    checkStatuses();
  }, [user, post.user_id, bagCardData?.id]);

  const handleBagLike = async () => {
    if (!user || !bagCardData) return;

    try {
      if (isBagLiked) {
        // Unlike bag
        const { error } = await supabase
          .from('bag_tees')
          .delete()
          .eq('user_id', user.id)
          .eq('bag_id', bagCardData.id);

        if (error) throw error;
        setIsBagLiked(false);
        setBagCardData(prev => ({
          ...prev,
          likes_count: Math.max(0, (prev?.likes_count || 0) - 1)
        }));
      } else {
        // Like bag
        const { error } = await supabase
          .from('bag_tees')
          .insert({
            user_id: user.id,
            bag_id: bagCardData.id
          });

        if (error) throw error;
        setIsBagLiked(true);
        setBagCardData(prev => ({
          ...prev,
          likes_count: (prev?.likes_count || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling bag like:', error);
      toast.error('Failed to update bag like');
    }
  };

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);

        if (error) throw error;
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            post_id: post.id
          });

        if (error) throw error;
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const getPostIcon = () => {
    switch (post.type) {
      case 'new_equipment':
        return post.content?.is_photo ? <Camera className="w-4 h-4" /> : <Plus className="w-4 h-4" />;
      case 'equipment_photo':
        return <Camera className="w-4 h-4" />;
      case 'bag_update':
        return <RotateCcw className="w-4 h-4" />;
      case 'milestone':
        return <Trophy className="w-4 h-4" />;
      case 'playing':
        return <Trophy className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPostTitle = () => {
    switch (post.type) {
      case 'new_equipment':
        return post.content?.is_photo 
          ? `Shared a photo of ${post.content?.equipment_name}`
          : `Added ${post.content?.equipment_name} to their bag`;
      case 'equipment_photo':
        return post.equipment 
          ? `Shared a photo of ${post.equipment.brand} ${post.equipment.model}`
          : 'Shared an equipment photo';
      case 'bag_update':
        return post.content?.bag_name?.includes('Created') 
          ? post.content?.bag_name
          : `Updated ${post.content?.bag_name}`;
      case 'milestone':
        return 'Reached a milestone';
      case 'playing':
        return 'Playing a round';
      default:
        return 'Shared an update';
    }
  };

  // State for bag data
  const [bagCardData, setBagCardData] = useState<any>(null);


  // Fetch bag data when needed
  useEffect(() => {
    const fetchBagData = async () => {
      const bagId = post.bag_id || post.bag?.id || userBagId;
      if (!bagId) return;
      
      console.log('[FeedCard] Fetching bag data for:', {
        postId: post.id,
        postType: post.type,
        bagId,
        source: post.bag_id ? 'post.bag_id' : post.bag?.id ? 'post.bag.id' : 'userBagId fallback'
      });

      try {
        // Use the same getBagById function that bags browser uses
        const bagData = await getBagById(bagId);
        
        console.log('[FeedCard] Fetched bag:', {
          bagName: bagData.name,
          equipmentCount: bagData.bag_equipment?.length,
          totalValue: bagData.totalValue
        });
        
        setBagCardData(bagData);
      } catch (error) {
        console.error('[FeedCard] Error fetching bag:', error);
      }
    };

    // Always fetch fresh bag data with equipment
    if (post.bag_id || post.bag?.id || userBagId) {
      fetchBagData();
    }
  }, [post.bag, userBagId, post.bag_id]);

  return (
    <div className={cn(
      "relative preserve-3d transition-transform duration-700",
      isFlipped && "rotate-y-180"
    )}>
      {/* Front of card */}
      <Card className={cn(
        "glass-card p-6 space-y-4 backface-hidden min-h-[400px]",
        isFlipped && "invisible"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.profiles?.avatar_url || post.profile?.avatar_url} />
              <AvatarFallback>{getDisplayInitials(post.profiles || post.profile)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{getDisplayName(post.profiles || post.profile)}</span>
                <div className="flex items-center gap-1 text-primary">
                  {getPostIcon()}
                  <span className="text-xs">{getPostTitle()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                {(post.profiles?.handicap !== undefined || post.profile?.handicap !== undefined) && (
                  <>
                    <span>•</span>
                    <span>{post.profiles?.handicap || post.profile?.handicap} HCP</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {(post.type === 'new_equipment' || post.type === 'equipment_photo' || post.bag) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFlipped(true)}
              className="text-white/60 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        {(post.content?.photo_url || (post.type === 'equipment_photo' && post.media_urls?.[0])) && (
          <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setIsFlipped(true)}>
            <img
              src={post.content?.photo_url || post.media_urls?.[0]}
              alt="Equipment photo"
              className="w-full h-64 md:h-80 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {(post.content?.caption || (post.type === 'equipment_photo' && post.content)) && (
          <p className="text-white/80">{post.content?.caption || post.content}</p>
        )}

        {post.type === 'bag_update' && post.content?.changes && (
          <div className="space-y-1">
            {post.content.changes.map((change, index) => (
              <div key={index} className="text-sm text-white/70">
                • {change}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-4">
            <TeedBallLike
              isLiked={isLiked}
              likeCount={likeCount}
              onLike={handleLike}
              size="md"
              showCount={true}
              disabled={!user || isLiking}
              className="text-white/60 hover:text-white"
            />
            <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <MessageCircle className="w-4 h-4" />
              Comment
            </button>
            <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </Card>


      {/* Back of card - Bag showcase for all equipment posts */}
      {(post.type === 'new_equipment' || post.type === 'equipment_photo' || post.bag) && (bagCardData || userBagId) && (
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180",
          !isFlipped && "invisible"
        )}>
          {bagCardData ? (
            <>
              <BagCard 
                bag={bagCardData}
                onView={() => navigate(`/bag/${bagCardData.id}`)}
                onLike={handleBagLike}
                onFollow={async (userId: string, username: string) => {
                  setFollowLoading(true);
                  try {
                    await toggleFollow(user?.id || '', userId);
                    setIsFollowing(!isFollowing);
                    toast.success(isFollowing ? 'Unfollowed' : 'Following');
                  } catch (error) {
                    toast.error('Failed to update follow status');
                  } finally {
                    setFollowLoading(false);
                  }
                }}
                isLiked={isBagLiked}
                isFollowing={isFollowing}
                currentUserId={user?.id}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFlipped(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white z-50"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Card className="glass-card p-6 h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-white/60">
                <p>Loading bag details...</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Equipment Showcase Modal */}
      {post.equipment && (
        <EquipmentShowcaseModal
          bagEquipment={{
            id: post.id,
            bag_id: post.bag_id || '',
            equipment_id: post.equipment_id || post.equipment.id,
            is_featured: false,
            created_at: post.created_at,
            equipment: post.equipment,
            custom_photo_url: post.content?.photo_url || post.media_urls?.[0]
          } as any}
          isOpen={equipmentModalOpen}
          onClose={() => setEquipmentModalOpen(false)}
        />
      )}
    </div>
  );
});