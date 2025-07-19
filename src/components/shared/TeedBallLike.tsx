import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeedBallLikeProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;  // Changed from onLike to onToggle and removed async
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  disabled?: boolean;
}

// Custom teed golf ball SVG icon - based on provided designs
export const TeedBallIcon = ({ className, filled = false }: { className?: string; filled?: boolean }) => {
  if (filled) {
    // Green filled version with outline ball
    return (
      <svg
        viewBox="0 0 200 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Golf ball - outline only when filled */}
        <circle
          cx="100"
          cy="80"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="20"
        />
        {/* Tee */}
        <path
          d="M 20 150 L 180 150 C 180 150 180 170 160 180 L 120 200 L 120 280 C 120 290 110 300 100 300 C 90 300 80 290 80 280 L 80 200 L 40 180 C 20 170 20 150 20 150 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  
  // Outline version for default state
  return (
    <svg
      viewBox="0 0 200 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Golf ball - outline */}
      <circle
        cx="100"
        cy="80"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
      />
      {/* Tee - outline */}
      <path
        d="M 20 150 L 180 150 C 180 150 180 170 160 180 L 120 200 L 120 280 C 120 290 110 300 100 300 C 90 300 80 290 80 280 L 80 200 L 40 180 C 20 170 20 150 20 150 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export function TeedBallLike({
  isLiked,
  likeCount,
  onToggle,
  size = 'md',
  showCount = true,
  className,
  disabled = false
}: TeedBallLikeProps) {
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

  const handleClick = () => {
    if (disabled) return;

    // Optimistic update
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticCount(wasLiked ? optimisticCount - 1 : optimisticCount + 1);

    // Call the toggle function
    try {
      onToggle();
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setOptimisticLiked(wasLiked);
      setOptimisticCount(likeCount);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'flex items-center gap-1 transition-colors duration-200',
        buttonSizeClasses[size],
        optimisticLiked 
          ? 'text-primary hover:text-primary/80' 
          : 'text-current hover:text-primary',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      <TeedBallIcon 
        className={cn(
          sizeClasses[size],
          'transition-all duration-200',
          optimisticLiked ? 'scale-110' : 'scale-100 hover:scale-105'
        )}
        filled={optimisticLiked}
      />
      {showCount && (
        <span className={cn(
          'font-medium transition-colors duration-200',
          optimisticLiked && 'text-primary'
        )}>
          {optimisticCount}
        </span>
      )}
    </Button>
  );
}

export default TeedBallLike;