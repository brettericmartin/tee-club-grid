import { useState, useEffect } from 'react';
import { Star, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { teeReview, checkUserTeedReview } from '@/services/equipment';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: {
    id: string;
    user_id: string;
    rating: number;
    title?: string;
    review?: string;
    created_at: string;
    tee_count: number;
    profiles?: {
      username: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  onTeeUpdate?: () => void;
}

export default function ReviewCard({ review, onTeeUpdate }: ReviewCardProps) {
  const { user } = useAuth();
  const [isTeed, setIsTeed] = useState(false);
  const [teeCount, setTeeCount] = useState(review.tee_count || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTeeAnimation, setShowTeeAnimation] = useState(false);

  console.log('[ReviewCard] Rendering review:', review.id);

  useEffect(() => {
    if (user) {
      checkIfUserTeed();
    }
  }, [user, review.id]);

  const checkIfUserTeed = async () => {
    if (!user) return;
    
    try {
      const hasTeed = await checkUserTeedReview(review.id, user.id);
      setIsTeed(hasTeed);
      console.log('[ReviewCard] User teed status:', hasTeed);
    } catch (error) {
      console.error('[ReviewCard] Error checking tee status:', error);
    }
  };

  const handleTeeClick = async () => {
    if (!user) {
      // TODO: Show sign in prompt
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);
    console.log('[ReviewCard] Toggling tee:', { reviewId: review.id, currentlyTeed: isTeed });

    try {
      const newTeedState = !isTeed;
      
      // Optimistic update
      setIsTeed(newTeedState);
      setTeeCount(prev => newTeedState ? prev + 1 : prev - 1);
      
      if (newTeedState) {
        setShowTeeAnimation(true);
        setTimeout(() => setShowTeeAnimation(false), 1000);
      }

      await teeReview(review.id, user.id, newTeedState);
      onTeeUpdate?.();
    } catch (error) {
      console.error('[ReviewCard] Error toggling tee:', error);
      // Revert optimistic update
      setIsTeed(!isTeed);
      setTeeCount(review.tee_count);
    } finally {
      setIsProcessing(false);
    }
  };

  const displayName = review.profiles?.display_name || review.profiles?.username || 'Anonymous';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card className="bg-[#1a1a1a] border-white/10">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={review.profiles?.avatar_url} alt={displayName} />
              <AvatarFallback className="bg-[#2a2a2a] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white">{displayName}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-4 h-4',
                        star <= review.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-600'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        {review.title && (
          <h4 className="font-semibold text-lg mb-2 text-white">{review.title}</h4>
        )}

        {/* Content */}
        <p className="text-white/80 whitespace-pre-wrap">{review.review}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTeeClick}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 transition-all",
              isTeed && "text-[#10B981]"
            )}
          >
            <div className="relative">
              <Circle 
                className={cn(
                  "w-5 h-5 transition-all",
                  isTeed ? "fill-current" : ""
                )}
              />
              {showTeeAnimation && (
                <Circle 
                  className="w-5 h-5 absolute inset-0 animate-ping fill-current"
                />
              )}
            </div>
            <span className="text-sm font-medium">{teeCount}</span>
            <span className="text-sm">{isTeed ? 'Teed' : 'Tee'}</span>
          </Button>

          {/* Future: Add helpful button */}
          {/* <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">Helpful</span>
          </Button> */}
        </div>
      </CardContent>
    </Card>
  );
}