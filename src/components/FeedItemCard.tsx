import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Eye, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { formatCompactCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { FeedItemData, getPostTypeLabel, formatTimestamp } from '@/utils/feedTransformer';
import { BagCard } from '@/components/bags/BagCard';
import CommentModal from '@/components/comments/CommentModal';
import { toggleBagLike } from '@/services/bags';
import { toast } from 'sonner';
import { useScrollAnimation } from '@/utils/animations';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  bag_equipment?: Array<{
    equipment?: Equipment;
  }>;
};

interface FeedItemCardProps {
  post: FeedItemData;
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onFollow?: (userId: string) => void;
}

export const FeedItemCard = ({ post, currentUserId, onLike, onFollow }: FeedItemCardProps) => {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollAnimation(0.1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isFollowing, setIsFollowing] = useState(post.isFromFollowed);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [equipmentData, setEquipmentData] = useState<Record<string, Equipment>>({});
  const [userBag, setUserBag] = useState<Bag | null>(null);
  const [loadingBag, setLoadingBag] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [bagLiked, setBagLiked] = useState(false);
  const [bagLikeCount, setBagLikeCount] = useState(0);

  // Load user's bag data for flip card back
  useEffect(() => {
    const loadUserBag = async () => {
      if (!post.userId) return;
      
      setLoadingBag(true);
      try {
        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', post.userId)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }

        // Get user's primary bag with full equipment relationships
        const { data: primaryBag, error: bagError } = await supabase
          .from('user_bags')
          .select(`
            *,
            bag_equipment (
              *,
              equipment (
                *,
                equipment_photos (
                  id,
                  photo_url,
                  likes_count,
                  is_primary
                )
              )
            )
          `)
          .eq('user_id', post.userId)
          .eq('is_primary', true)
          .single();
        
        if (bagError) {
          console.error('Error fetching user bag:', bagError);
          // Try simpler query without foreign key joins
          const { data: simpleBag } = await supabase
            .from('user_bags')
            .select(`
              *,
              bag_equipment (
                *,
                equipment (
                  *,
                  equipment_photos (
                    id,
                    photo_url,
                    likes_count,
                    is_primary
                  )
                )
              )
            `)
            .eq('user_id', post.userId)
            .eq('is_primary', true)
            .single();
          
          if (simpleBag) {
            setUserBag(simpleBag);
            setBagLikeCount(simpleBag.likes_count || 0);
          }
          return;
        }
        
        if (primaryBag) {
          setUserBag(primaryBag);
          setBagLikeCount(primaryBag.likes_count || 0);
          
          // Check if current user has liked this bag
          if (currentUserId) {
            const { data: likeData } = await supabase
              .from('bag_likes')
              .select('id')
              .eq('user_id', currentUserId)
              .eq('bag_id', primaryBag.id)
              .single();
            
            setBagLiked(!!likeData);
          }
          
          // Load equipment data for featured clubs
          const equipment = primaryBag.bag_equipment
            ?.filter(be => be.equipment)
            .slice(0, 3)
            .map(be => be.equipment!)
            .filter(Boolean);
          
          if (equipment) {
            const equipmentMap = equipment.reduce((acc, eq) => ({
              ...acc,
              [eq.id]: eq
            }), {});
            setEquipmentData(equipmentMap);
          }
        }
      } catch (error) {
        console.error('Error loading user bag:', error);
      } finally {
        setLoadingBag(false);
      }
    };
    
    loadUserBag();
  }, [post.userId, currentUserId]);


  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    if (onFollow) {
      onFollow(post.userId);
    }
  };

  const handleEquipmentClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    if (post.equipmentId) {
      navigate(`/equipment/${post.equipmentId}`);
    }
  };

  const renderFrontContent = () => {
    const hasMultipleImages = post.mediaUrls && post.mediaUrls.length > 1;
    const isEquipmentPost = post.postType === 'equipment_photo' || post.postType === 'new_equipment';
    const isMultiEquipmentPost = post.postType === 'multi_equipment_photos';
    
    // Handle multi-equipment photo posts with carousel
    if (isMultiEquipmentPost && post.content?.photos) {
      return (
        <div className="relative bg-black">
          <Carousel className="w-full">
            <CarouselContent>
              {post.content.photos.map((photo: any, index: number) => (
                <CarouselItem key={index}>
                  <div className="relative h-full">
                    <img 
                      src={photo.url} 
                      alt={photo.equipment_name}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                    {/* Equipment tag overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/equipment/${photo.equipment_id}`);
                        }}
                        className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-black/80 transition-colors"
                      >
                        <span className="text-white text-sm font-medium">{photo.equipment_name}</span>
                      </button>
                      {photo.caption && (
                        <p className="text-white/90 text-sm mt-2">{photo.caption}</p>
                      )}
                    </div>
                    {/* Photo counter */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">
                        {index + 1} / {post.content.photos.length}
                      </span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
          
          {/* Overall caption overlay */}
          {post.content.overall_caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none">
              <p className="text-white text-sm">{post.content.overall_caption}</p>
              <p className="text-white/60 text-xs mt-1">
                {post.content.equipment_count} items • {post.content.photo_count} photos
              </p>
            </div>
          )}
        </div>
      );
    }
    
    // Original single image rendering
    return (
      <div className="relative">
        {/* Main Image */}
        <img 
          src={post.imageUrl} 
          alt={post.caption}
          className="w-full object-cover"
        />
        
        {/* Multiple images indicator */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-full">
            <span className="text-white text-xs font-medium">
              1/{post.mediaUrls.length}
            </span>
          </div>
        )}
        
        {/* Post type badge */}
        <div className="absolute top-3 left-3 bg-primary/90 text-black px-3 py-1 rounded-full">
          <span className="text-xs font-semibold">{getPostTypeLabel(post.postType)}</span>
        </div>
        
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm font-medium line-clamp-2">{post.caption}</p>
          
          {/* Equipment info for equipment posts */}
          {isEquipmentPost && post.equipmentData && (
            <div 
              className="mt-2 inline-flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1 rounded-full cursor-pointer hover:bg-black/60 transition-colors"
              onClick={handleEquipmentClick}
            >
              <span className="text-white text-xs">
                {post.equipmentData.brand} {post.equipmentData.model}
              </span>
              <Eye className="w-3 h-3 text-white/70" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBackContent = () => {
    // Always show the user's bag on the back
    if (loadingBag) {
      return (
        <div className="bg-gray-900 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
        </div>
      );
    }

    if (!userBag) {
      return (
        <div className="bg-gray-900 p-12 flex flex-col justify-center items-center text-center">
          <p className="text-white text-lg font-medium mb-2">{post.userName} hasn't created a bag yet</p>
          <p className="text-gray-400 text-sm">Check back later to see their equipment</p>
        </div>
      );
    }

    // Render the actual BagCard component
    return (
      <BagCard
          bag={{
            ...userBag,
            profiles: userProfile,
            likes_count: bagLikeCount
          }}
          onView={() => navigate(`/bag/${userBag.id}`)}
          onLike={async () => {
            if (!currentUserId) {
              toast.error('Please sign in to like bags');
              return;
            }
            
            try {
              const newLikedState = await toggleBagLike(currentUserId, userBag.id);
              setBagLiked(newLikedState);
              setBagLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
            } catch (error) {
              console.error('Error toggling bag like:', error);
              toast.error('Failed to update like');
            }
          }}
          onFollow={async () => {
            if (onFollow) onFollow(post.userId);
          }}
          isLiked={bagLiked}
          isFollowing={isFollowing}
          currentUserId={currentUserId}
        />
    );
  };

  return (
    <>
      <div 
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`relative bg-gray-900 rounded-xl overflow-hidden transition-all duration-500 ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
        style={{
          transitionDelay: `${Math.random() * 100}ms`
        }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <Link to={userBag ? `/bag/${userBag.id}` : '#'} className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={post.userAvatar || undefined} 
                alt={post.userName}
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                {post.userName?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium">{post.userName}</p>
              <p className="text-gray-400 text-xs">
                {post.userTitle || (post.userHandicap ? `${post.userHandicap} HCP` : 'Golfer')}
              </p>
            </div>
          </Link>
          
          {currentUserId && currentUserId !== post.userId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFollowToggle}
              className={`transition-colors ${
                isFollowing 
                  ? 'text-green-500 hover:text-green-400' 
                  : 'text-white hover:text-primary'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          )}
        </div>
        
        {/* Card Content - Toggleable */}
        <div className="relative overflow-hidden">
          {/* Toggle Button - Made larger and more prominent */}
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="absolute top-3 right-3 z-10 bg-primary/90 hover:bg-primary hover:scale-110 text-black p-3 rounded-full transition-all shadow-lg"
            aria-label="Toggle view"
          >
            <img src="/MYBAG.png" alt="View Bag" className="w-6 h-6" />
          </button>
          
          {/* Content */}
          {isFlipped ? renderBackContent() : renderFrontContent()}
        </div>
        
        {/* Card Footer */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <div className="flex items-center gap-4">
            <TeedBallLike
              isLiked={isLiked}
              likeCount={post.likes}
              onToggle={() => {
                setIsLiked(!isLiked);
                if (onLike) onLike(post.postId);
              }}
            />
            
            <button 
              onClick={() => setShowComments(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{commentCount}</span>
            </button>
          </div>
          
          <p className="text-gray-400 text-xs">
            {formatTimestamp(post.timestamp)}
          </p>
        </div>
      </div>
      
      {/* Comment Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={post}
        currentUserId={currentUserId}
        onLike={onLike}
        isLiked={isLiked}
        commentCount={commentCount}
        onCommentCountChange={setCommentCount}
      />
    </>
  );
};