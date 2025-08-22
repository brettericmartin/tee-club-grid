import React from 'react';
import { ExternalLink, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackLinkClick } from '@/services/userEquipmentLinks';
import type { UserEquipmentLink } from '@/types/affiliateVideos';
import { cn } from '@/lib/utils';

interface AffiliateLinksDisplayProps {
  links: UserEquipmentLink[];
  bagId: string;
  userId?: string;
  className?: string;
  variant?: 'compact' | 'full';
  onLinkClick?: (link: UserEquipmentLink) => void;
}

export const AffiliateLinksDisplay: React.FC<AffiliateLinksDisplayProps> = ({
  links,
  bagId,
  userId,
  className,
  variant = 'compact',
  onLinkClick
}) => {
  if (!links || links.length === 0) {
    return null;
  }

  const handleLinkClick = async (link: UserEquipmentLink, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track the click
    await trackLinkClick(link.id, userId, bagId);
    
    // Callback
    onLinkClick?.(link);
    
    // Open link in new tab
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  // Find primary link
  const primaryLink = links.find(l => l.is_primary);
  const secondaryLinks = links.filter(l => !l.is_primary);

  if (variant === 'compact') {
    // Show only primary link as a prominent button
    if (!primaryLink) return null;
    
    return (
      <Button
        size="sm"
        className={cn(
          "bg-green-600 hover:bg-green-700 text-white",
          className
        )}
        onClick={(e) => handleLinkClick(primaryLink, e)}
      >
        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
        {primaryLink.label}
      </Button>
    );
  }

  // Full variant - show all links
  return (
    <div className={cn("space-y-2", className)}>
      {primaryLink && (
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => handleLinkClick(primaryLink, e)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {primaryLink.label}
          <ExternalLink className="w-3.5 h-3.5 ml-auto" />
        </Button>
      )}
      
      {secondaryLinks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {secondaryLinks.map((link) => (
            <Button
              key={link.id}
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={(e) => handleLinkClick(link, e)}
            >
              {link.label}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffiliateLinksDisplay;