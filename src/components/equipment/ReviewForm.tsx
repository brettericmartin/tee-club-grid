import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { createReview } from '@/services/equipment';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  equipmentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ equipmentId, onSuccess, onCancel }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    rating?: string;
    content?: string;
  }>({});

  console.log('[ReviewForm] Rendering for equipment:', equipmentId);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!content.trim()) {
      newErrors.content = 'Please write a review';
    } else if (content.trim().length < 10) {
      newErrors.content = 'Review must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You must be signed in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    console.log('[ReviewForm] Submitting review:', { rating, title, content });

    try {
      await createReview({
        equipment_id: equipmentId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        review: content.trim(), // Changed from 'content' to 'review'
      });

      toast({
        title: 'Review submitted!',
        description: 'Thank you for sharing your feedback',
      });

      // Reset form
      setRating(0);
      setTitle('');
      setContent('');
      setErrors({});

      onSuccess?.();
    } catch (error) {
      console.error('[ReviewForm] Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating */}
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'w-8 h-8 transition-colors',
                  (hoveredRating || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 && `${rating} out of 5`}
          </span>
        </div>
        {errors.rating && (
          <p className="text-sm text-red-500">{errors.rating}</p>
        )}
      </div>

      {/* Title (optional) */}
      <div className="space-y-2">
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={100}
          className="bg-white/5 border-white/10"
        />
      </div>

      {/* Review content */}
      <div className="space-y-2">
        <Label htmlFor="content">Your Review</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this equipment..."
          rows={5}
          className={cn(
            "bg-white/5 border-white/10 resize-none",
            errors.content && "border-red-500"
          )}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {content.length} characters
          </p>
          {errors.content && (
            <p className="text-xs text-red-500">{errors.content}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-[#10B981] hover:bg-[#0ea674]"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}