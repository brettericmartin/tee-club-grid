import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getReviews } from '@/services/equipment';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';

interface ReviewListProps {
  equipmentId: string;
  isModal?: boolean;
}

type SortOption = 'newest' | 'most_teed';

export default function ReviewList({ equipmentId, isModal = false }: ReviewListProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  console.log('[ReviewList] Rendering for equipment:', equipmentId);

  useEffect(() => {
    loadReviews();
  }, [equipmentId, sortBy]);

  const loadReviews = async () => {
    setLoading(true);
    console.log('[ReviewList] Loading reviews with sort:', sortBy);
    
    try {
      const data = await getReviews(equipmentId, sortBy);
      setReviews(data);
      
      // Check if current user has already reviewed
      if (user) {
        const hasReviewed = data.some((review: any) => review.user_id === user.id);
        setUserHasReviewed(hasReviewed);
      }
    } catch (error) {
      console.error('[ReviewList] Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitSuccess = () => {
    setShowReviewForm(false);
    loadReviews();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            Reviews ({reviews.length})
          </h3>
          {reviews.length > 0 && (
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_teed">Most Teed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {user && !userHasReviewed && (
          <Button
            onClick={() => setShowReviewForm(true)}
            className="bg-[#10B981] hover:bg-[#0ea674]"
            size={isModal ? 'sm' : 'default'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Write Review
          </Button>
        )}
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm
            equipmentId={equipmentId}
            onSuccess={handleReviewSubmitSuccess}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onTeeUpdate={loadReviews}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No reviews yet</p>
            {user && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className="bg-[#10B981] hover:bg-[#0ea674]"
              >
                Be the first to review
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show more button for pagination (future) */}
      {reviews.length >= 10 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm">
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
}