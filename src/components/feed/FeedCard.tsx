import { useState, useEffect } from 'react';
import { MessageCircle, Share2, RotateCcw, Clock, Plus, Camera, Trophy, User, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BagCard from '@/components/BagCard';
import { cn } from '@/lib/utils';
import { EquipmentShowcaseModal } from '@/components/EquipmentShowcaseModal';
import { toggleFollow } from '@/services/users';
import { TeedBallLike } from '@/components/shared/TeedBallLike';

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

export function FeedCard({ post, onUpdate }: FeedCardProps) {
  const { user } = useAuth();
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

  // Transform bag data for BagCard if available
  const bagCardData = post.bag ? {
    id: post.bag.id,
    title: post.bag.name,
    owner: post.profile?.username || 'Unknown',
    handicap: post.profile?.handicap || 0,
    totalValue: post.bag.bag_equipment.reduce((sum, item) => 
      sum + (item.equipment.msrp || 0), 0
    ),
    clubCount: post.bag.bag_equipment.length,
    likeCount: 0, // Would need to fetch from bag_likes
    image: `/assets/${post.bag.background_image || 'minimalist-carry-bag'}.jpg`,
    isLiked: false,
    brands: [...new Set(post.bag.bag_equipment.map(item => item.equipment.brand))].slice(0, 3)
  } : null;

  return (
    <div className={cn(
      "relative preserve-3d transition-all duration-700",
      isFlipped && "rotate-y-180"
    )}>
      {/* Front of card */}
      <Card className={cn(
        "glass-card p-4 space-y-4 backface-hidden",
        isFlipped && "invisible"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.profiles?.avatar_url || post.profile?.avatar_url} />
              <AvatarFallback>{(post.profiles?.username || post.profile?.username)?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{post.profiles?.username || post.profile?.username}</span>
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
              className="w-full h-auto"
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

      {/* Back of card - Equipment details for equipment posts */}
      {(post.type === 'new_equipment' || post.type === 'equipment_photo') && !post.bag && (
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180",
          !isFlipped && "invisible"
        )}>
          <Card className="glass-card p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">Equipment Details</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFlipped(false)}
                className="text-white/60 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Equipment info */}
            {post.equipment && (
              <div className="mb-6">
                <button 
                  onClick={() => setEquipmentModalOpen(true)}
                  className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors w-full text-left">
                  <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                    {post.content?.photo_url || post.media_urls?.[0] ? (
                      <img 
                        src={post.content?.photo_url || post.media_urls?.[0]} 
                        alt={`${post.equipment.brand} ${post.equipment.model}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{post.equipment.brand}</p>
                    <p className="text-sm text-white/70">{post.equipment.model}</p>
                    <p className="text-xs text-white/50 capitalize">{post.equipment.category?.replace('_', ' ')}</p>
                  </div>
                  <Eye className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 mt-auto">
              <Button 
                variant="outline" 
                className="w-full glass-button justify-start"
                onClick={() => {
                  // Navigate to user's bag
                  const bagId = post.bag_id || userBagId;
                  if (bagId) {
                    window.location.href = `/bag/${bagId}`;
                  } else {
                    toast.error('Bag not found');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View {post.profiles?.username || 'User'}'s Bag
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full glass-button justify-start"
                disabled={!user || followLoading || user.id === post.user_id}
                onClick={async () => {
                  if (!user || !post.user_id) return;
                  
                  setFollowLoading(true);
                  try {
                    const isNowFollowing = await toggleFollow(user.id, post.user_id);
                    setIsFollowing(isNowFollowing);
                    toast.success(isNowFollowing ? 'Following user!' : 'Unfollowed user');
                  } catch (error) {
                    console.error('Follow error:', error);
                    toast.error('Failed to update follow status');
                  } finally {
                    setFollowLoading(false);
                  }
                }}
              >
                <User className="w-4 h-4 mr-2" />
                {isFollowing ? 'Unfollow' : 'Follow'} {post.profiles?.username || 'User'}
              </Button>
            </div>

            {/* User info */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.profiles?.avatar_url || post.profile?.avatar_url} />
                  <AvatarFallback>{(post.profiles?.username || post.profile?.username)?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{post.profiles?.username || post.profile?.username}</p>
                  {(post.profiles?.handicap !== undefined || post.profile?.handicap !== undefined) && (
                    <p className="text-sm text-white/60">{post.profiles?.handicap || post.profile?.handicap} HCP</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Back of card - Bag showcase */}
      {post.bag && bagCardData && (
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180",
          !isFlipped && "invisible"
        )}>
          <div className="relative h-full">
            <BagCard bag={bagCardData} />
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
}