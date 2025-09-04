import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EquipmentImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function EquipmentImage({
  src,
  alt,
  className,
  fallbackText
}: EquipmentImageProps) {
  const [imageError, setImageError] = useState(false);
  
  // Generate fallback text from alt
  const getFallbackText = () => {
    if (fallbackText) return fallbackText;
    
    // Extract brand initials from alt text
    const words = alt.split(' ');
    if (words.length >= 2) {
      // Take first letter of first two words
      return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
    return words[0]?.[0]?.toUpperCase() || '?';
  };
  
  // If no src or error occurred, show fallback
  if (!src || imageError) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40",
        className
      )}>
        <span className="text-white font-bold text-4xl">
          {getFallbackText()}
        </span>
      </div>
    );
  }
  
  // Handle Supabase storage URLs
  let finalSrc = src;
  if (src.includes('supabase.co/storage')) {
    // Ensure we're using the public URL format
    if (!src.includes('/public/')) {
      finalSrc = src.replace('/storage/v1/object/', '/storage/v1/object/public/');
    }
  }
  
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}