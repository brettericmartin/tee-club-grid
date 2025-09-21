import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { listLinksForBagEquipment } from '@/services/userEquipmentLinks';
import { getBestBagEquipmentPhoto } from '@/services/unifiedPhotoService';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  custom_photo_url?: string; // Deprecated
  selected_photo_id?: string; // New unified approach
};

interface BagEquipmentTileProps {
  item: BagEquipment;
  onClick?: () => void;
  showBuyBadge?: boolean;
  className?: string;
}

export function BagEquipmentTile({ 
  item, 
  onClick,
  showBuyBadge = true,
  className 
}: BagEquipmentTileProps) {
  // Fetch links to check for primary buy link
  const { data: linksResponse } = useQuery({
    queryKey: ['links', item.id],
    queryFn: () => listLinksForBagEquipment(item.id),
    enabled: showBuyBadge && !!item.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const links = linksResponse?.data || [];
  const primaryLink = links.find((l: any) => l.is_primary);

  // Get the primary image for equipment using unified photo service
  const getEquipmentImage = () => {
    // Use the new unified bag equipment photo service
    return getBestBagEquipmentPhoto({
      selected_photo_id: item.selected_photo_id,
      custom_photo_url: item.custom_photo_url, // Fallback during migration
      equipment: item.equipment
    });
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryLink) {
      window.open(`/api/links/redirect?id=${primaryLink.id}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Equipment image */}
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-900/30">
        {getEquipmentImage() ? (
          <img
            src={getEquipmentImage()}
            alt={`${item.equipment.brand} ${item.equipment.model}`}
            className="w-full h-full object-contain p-4 hover:scale-110 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/50 text-xs text-center px-2">
              {item.equipment.brand}<br />
              {item.equipment.model}
            </span>
          </div>
        )}
      </div>
      
      {/* Buy Badge - shows when primary link exists */}
      {showBuyBadge && primaryLink && (
        <button
          onClick={handleBuyClick}
          className={cn(
            "absolute top-2 right-2",
            "bg-green-600 hover:bg-green-700",
            "text-white rounded-full",
            "p-2 shadow-lg",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-200",
            "transform hover:scale-110"
          )}
          aria-label={`Buy ${item.equipment.brand} ${item.equipment.model}`}
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      )}
      
      {/* Hover overlay with equipment info */}
      <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-colors duration-200 rounded-lg flex items-end p-2 opacity-0 hover:opacity-100">
        <div className="w-full">
          <p className="text-white text-sm font-medium truncate">
            {item.equipment.brand}
          </p>
          <p className="text-white/80 text-sm truncate">
            {item.equipment.model}
          </p>
          {primaryLink && (
            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              {primaryLink.label || 'Available to buy'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BagEquipmentTile;