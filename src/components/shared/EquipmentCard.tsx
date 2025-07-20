import { FC, memo } from 'react';
import { Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EquipmentTile from './EquipmentTile';
import { formatCurrency } from '@/lib/formatters';

interface EquipmentCardProps {
  equipment: {
    id: string;
    brand: string;
    model: string;
    category: string;
    msrp: number;
    image_url?: string;
    primaryPhoto?: string;
    most_liked_photo?: string;
    equipment_photos?: any[];
    savesCount?: number;
    [key: string]: any; // Allow additional properties
  };
  variant?: 'grid' | 'list';
  isSaved?: boolean;
  onSaveToggle?: (e: React.MouseEvent) => void;
  onViewDetails?: () => void;
  className?: string;
}

const EquipmentCard: FC<EquipmentCardProps> = ({
  equipment,
  variant = 'grid',
  isSaved = false,
  onSaveToggle,
  onViewDetails,
  className
}) => {
  const formatPrice = (price: number) => {
    return formatCurrency(price);
  };

  const getCategoryDisplay = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer',
          'hover:bg-[#2a2a2a] hover:border-white/20 hover:shadow-lg transition-all duration-200',
          className
        )}
        onClick={onViewDetails}
      >
        <EquipmentTile
          equipment={equipment}
          size="md"
          showPhotoCount={true}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{equipment.brand} {equipment.model}</h3>
          <p className="text-muted-foreground text-sm">{getCategoryDisplay(equipment.category)}</p>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="font-bold text-foreground">{formatPrice(equipment.msrp)}</span>
            <span className="text-muted-foreground">{equipment.savesCount || 0} saves</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-[#2a2a2a] border border-white/10 hover:bg-[#3a3a3a] hover:border-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            View Details
          </Button>
          {onSaveToggle && (
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "bg-[#2a2a2a] border border-white/10 hover:bg-[#3a3a3a] hover:border-white/20 transition-colors",
                isSaved ? "text-[#10B981]" : "text-muted-foreground hover:text-[#10B981]"
              )}
              onClick={onSaveToggle}
            >
              <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className={cn(
        'bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3 cursor-pointer',
        'hover:bg-[#2a2a2a] hover:border-white/20 hover:shadow-lg transition-all duration-200',
        className
      )}
      onClick={onViewDetails}
    >
      <div className="aspect-square relative">
        <EquipmentTile
          equipment={equipment}
          size="lg"
          showPhotoCount={true}
          className="w-full h-full"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {equipment.brand}
        </p>
        <h3 className="font-medium text-foreground line-clamp-1">{equipment.model}</h3>
        <p className="text-sm text-muted-foreground">{getCategoryDisplay(equipment.category)}</p>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-foreground">{formatPrice(equipment.msrp)}</span>
        <span className="text-muted-foreground">{equipment.savesCount || 0} saves</span>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 bg-[#2a2a2a] border border-white/10 hover:bg-[#3a3a3a] hover:border-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          View Details
        </Button>
        {onSaveToggle && (
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "bg-[#2a2a2a] border border-white/10 hover:bg-[#3a3a3a] hover:border-white/20 transition-colors",
              isSaved ? "text-[#10B981]" : "text-muted-foreground hover:text-[#10B981]"
            )}
            onClick={onSaveToggle}
          >
            <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(EquipmentCard);