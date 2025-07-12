import { cn } from '@/lib/utils';

interface TeedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TeedLogo = ({ className, size = 'md' }: TeedLogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <svg
      viewBox="0 0 200 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
    >
      {/* Golf ball - outline with current primary color */}
      <circle
        cx="100"
        cy="80"
        r="70"
        fill="none"
        stroke="#10B981"
        strokeWidth="20"
      />
      {/* Tee - filled with current primary color */}
      <path
        d="M 20 150 L 180 150 C 180 150 180 170 160 180 L 120 200 L 120 280 C 120 290 110 300 100 300 C 90 300 80 290 80 280 L 80 200 L 40 180 C 20 170 20 150 20 150 Z"
        fill="#10B981"
      />
    </svg>
  );
};

export default TeedLogo;