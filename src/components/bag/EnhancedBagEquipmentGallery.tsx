import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BagEquipmentTile } from './BagEquipmentTile';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  equipment_photos?: Array<{
    photo_url: string;
    likes_count: number;
    is_primary: boolean;
  }>;
  most_liked_photo?: string;
  primaryPhoto?: string;
};

type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  custom_photo_url?: string;
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
};

interface EnhancedBagEquipmentGalleryProps {
  bagEquipment: BagEquipment[];
  onEquipmentClick?: (item: BagEquipment) => void;
  showBuyBadges?: boolean;
  className?: string;
}

/**
 * Enhanced version of BagEquipmentGallery that includes buy badges
 * Uses BagEquipmentTile component for each item
 */
export const EnhancedBagEquipmentGallery = ({ 
  bagEquipment, 
  onEquipmentClick,
  showBuyBadges = true,
  className = ''
}: EnhancedBagEquipmentGalleryProps) => {
  const navigate = useNavigate();

  const handleEquipmentClick = (item: BagEquipment) => {
    if (onEquipmentClick) {
      onEquipmentClick(item);
    } else {
      navigate(`/equipment/${item.equipment.id}`);
    }
  };

  return (
    <div className={className}>
      {/* Responsive grid layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {bagEquipment.map((item) => (
          <BagEquipmentTile
            key={item.id}
            item={item}
            onClick={() => handleEquipmentClick(item)}
            showBuyBadge={showBuyBadges}
          />
        ))}
      </div>
    </div>
  );
};

export default EnhancedBagEquipmentGallery;