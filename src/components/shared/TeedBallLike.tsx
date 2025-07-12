import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeedBallLikeProps {
  isLiked: boolean;
  likeCount: number;
  onLike: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  disabled?: boolean;
}

// Custom teed golf ball SVG icon
const TeedBallIcon = ({ className, filled = false }: { className?: string; filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Golf ball */}
    <circle
      cx="12"
      cy="8"
      r="4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Golf ball dimples */}
    {filled && (
      <>
        <circle cx="11" cy="7" r="0.5" fill="white" opacity="0.6" />
        <circle cx="13" cy="7.5" r="0.5" fill="white" opacity="0.6" />
        <circle cx="12" cy="9" r="0.5" fill="white" opacity="0.6" />
      </>
    )}
    {/* Tee */}
    <path
      d="M10 12 L14 12 L13 16 L11 16 Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Tee base */}
    <line
      x1="9"
      y1="16"
      x2="15"
      y2="16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export function TeedBallLike({
  isLiked,
  likeCount,
  onLike,
  size = 'md',
  showCount = true,
  className,
  disabled = false
}: TeedBallLikeProps) {
  const [loading, setLoading] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  // Sync with props when they change
  useEffect(() => {
    setOptimisticLiked(isLiked);
    setOptimisticCount(likeCount);
  }, [isLiked, likeCount]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'h-6 px-1.5 text-xs',
    md: 'h-8 px-2 text-sm',
    lg: 'h-10 px-3 text-base'
  };

  const handleLike = async () => {
    if (loading || disabled) return;

    // Optimistic update
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticCount(wasLiked ? optimisticCount - 1 : optimisticCount + 1);

    setLoading(true);
    try {
      await onLike();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update. Please try again.');
      // Revert optimistic update on error
      setOptimisticLiked(wasLiked);
      setOptimisticCount(likeCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'flex items-center gap-1 transition-all duration-200',
        buttonSizeClasses[size],
        optimisticLiked 
          ? 'text-primary hover:text-primary/80' 
          : 'text-muted-foreground hover:text-primary',
        loading && 'opacity-50',
        className
      )}
      onClick={handleLike}
      disabled={loading || disabled}
    >
      <TeedBallIcon 
        className={cn(
          sizeClasses[size],
          'transition-all duration-200',
          optimisticLiked ? 'scale-110' : 'hover:scale-105'
        )}
        filled={optimisticLiked}
      />
      {showCount && (
        <span className={cn(
          'font-medium transition-all duration-200',
          optimisticLiked && 'text-primary'
        )}>
          {optimisticCount}
        </span>
      )}
    </Button>
  );
}

export default TeedBallLike;