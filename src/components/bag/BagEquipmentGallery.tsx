import { useNavigate } from 'react-router-dom';
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

interface BagEquipmentGalleryProps {
  bagEquipment: BagEquipment[];
  onEquipmentClick?: (item: BagEquipment) => void;
}

const BagEquipmentGallery = ({ 
  bagEquipment, 
  onEquipmentClick 
}: BagEquipmentGalleryProps) => {
  const navigate = useNavigate();

  const handleEquipmentClick = (item: BagEquipment) => {
    if (onEquipmentClick) {
      onEquipmentClick(item);
    } else {
      navigate(`/equipment/${item.equipment.id}`);
    }
  };

  // Get the primary image for equipment
  const getEquipmentImage = (item: BagEquipment) => {
    return item.custom_photo_url || 
           item.equipment.most_liked_photo || 
           item.equipment.primaryPhoto || 
           item.equipment.image_url;
  };

  return (
    <div>
      {/* Simple 1x1 grid - larger items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {bagEquipment.map((item) => (
          <div
            key={item.id}
            className="relative group cursor-pointer"
            onClick={() => handleEquipmentClick(item)}
          >
            {/* Equipment image - borderless with rounded edges */}
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-900/30">
              {getEquipmentImage(item) ? (
                <img
                  src={getEquipmentImage(item)}
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
            
            {/* Simple hover overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-colors duration-200 rounded-lg flex items-end p-2 opacity-0 hover:opacity-100">
              <div className="w-full">
                <p className="text-white text-sm font-medium truncate">
                  {item.equipment.brand}
                </p>
                <p className="text-white/80 text-sm truncate">
                  {item.equipment.model}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BagEquipmentGallery;