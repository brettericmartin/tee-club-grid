import { useState, useEffect, memo } from 'react';
import { MessageCircle, Share2, RotateCcw, Clock, Plus, Camera, Trophy, User, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BagCard } from '@/components/bags/BagCard';
import { cn } from '@/lib/utils';
import { EquipmentShowcaseModal } from '@/components/EquipmentShowcaseModal';
import { toggleFollow } from '@/services/users';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { useNavigate } from 'react-router-dom';

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

  // Debug logging
  if (post.type === 'equipment_photo') {
    console.log('Equipment photo post:', post);
  }

  // Fetch user's primary bag on mount
  useEffect(() => {
    const fetchUserBag = async () => {
      if (post.user_id && !post.bag_id) {
        const { data } = await supabase
          .from('user_bags')
          .select('id')
          .eq('user_id', post.user_id)
          .eq('is_primary', true)
          .single();
        
        if (data) {
          setUserBagId(data.id);
        }
      }
    };
    
    fetchUserBag();
  }, [post.user_id, post.bag_id]);

  // Check if following
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (user && post.user_id && user.id !== post.user_id) {
        const { data } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', post.user_id)
          .single();
        
        setIsFollowing(!!data);
      }
    };
    
    checkFollowStatus();
  }, [user, post.user_id]);

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

  // Add missing handleBagLike function
  const handleBagLike = async () => {
    // For now, just use the regular handleLike function
    // In the future, this could handle bag-specific likes
    handleLike();
  };

  // Fetch bag data when needed
  useEffect(() => {
    const fetchBagData = async () => {
      const bagId = post.bag_id || userBagId;
      if (!bagId || bagCardData) return;

      const { data } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles (*),
          bag_equipment (
            *,
            custom_photo_url,
            equipment (*)
          )
        `)
        .eq('id', bagId)
        .single();

      if (data) {
        setBagCardData({
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          background_image: data.background_image,
          created_at: data.created_at,
          likes_count: data.likes_count || 0,
          views_count: data.views_count || 0,
          profiles: data.profiles,
          bag_equipment: data.bag_equipment || [],
        });
      }
    };

    if (post.bag) {
      // Use existing bag data from post
      setBagCardData({
        id: post.bag.id,
        user_id: post.bag.user_id,
        name: post.bag.name,
        background_image: post.bag.background_image,
        created_at: post.bag.created_at,
        likes_count: 0,
        views_count: 0,
        profiles: post.profiles || post.profile,
        bag_equipment: post.bag.bag_equipment || [],
      });
    } else if (userBagId || post.bag_id) {
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
              <AvatarFallback>{(post.profiles?.display_name || post.profiles?.username || post.profile?.display_name || post.profile?.username)?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{post.profiles?.display_name || post.profiles?.username || post.profile?.display_name || post.profile?.username}</span>
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
          <div className="relative h-full">
            {bagCardData ? (
              <BagCard 
                bag={bagCardData}
                onView={() => navigate(`/bag/${bagCardData.id}`)}
                onLike={handleBagLike}
                isLiked={false}
                currentUserId={user?.id}
              />
            ) : (
              <Card className="glass-card p-6 h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-white/60">
                  <p>Loading bag details...</p>
                </div>
              </Card>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFlipped(false)}
              className="absolute top-2 right-2 text-white/60 hover:text-white z-10"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
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