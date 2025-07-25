import { FC } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EquipmentTileProps {
  equipment: {
    id: string;
    brand: string;
    model: string;
    category: string;
    image_url?: string;
    primaryPhoto?: string;
    most_liked_photo?: string;
    equipment_photos?: any[];
  };
  size?: 'sm' | 'md' | 'lg';
  showPhotoCount?: boolean;
  className?: string;
  onClick?: () => void;
}

const getBrandAbbreviation = (brand: string): string => {
  return brand
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const EquipmentTile: FC<EquipmentTileProps> = ({
  equipment,
  size = 'md',
  showPhotoCount = true,
  className,
  onClick
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  // 4-tier image fallback system: most_liked_photo → primaryPhoto → image_url → brand initials
  const imageUrl = equipment.most_liked_photo || equipment.primaryPhoto || equipment.image_url;
  const photoCount = equipment.equipment_photos?.length || 0;

  return (
    <div
      className={cn(
        'bg-[#2a2a2a] border border-white/10 rounded-lg relative overflow-hidden cursor-pointer transition-all duration-200',
        'hover:bg-[#3a3a3a] hover:border-white/20 hover:shadow-md',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${equipment.brand} ${equipment.model}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      
      {/* Fallback display */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-gradient-to-br from-primary/20 to-primary/40',
          'text-white font-bold text-lg',
          imageUrl ? 'hidden' : 'flex'
        )}
        style={imageUrl ? { display: 'none' } : undefined}
      >
        {getBrandAbbreviation(equipment.brand)}
      </div>

      {/* Photo count badge */}
      {showPhotoCount && photoCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-[#10B981] text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-xs shadow-sm">
          <Camera className="w-2.5 h-2.5" />
          <span>{photoCount}</span>
        </div>
      )}
    </div>
  );
};

export default EquipmentTile;