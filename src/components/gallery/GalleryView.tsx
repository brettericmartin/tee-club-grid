import { useState } from 'react';
import { Star, Edit2 } from 'lucide-react';
import { BagItem } from '@/types/equipment';

interface GalleryViewProps {
  bagItems: BagItem[];
  isOwnBag: boolean;
  onEquipmentClick: (item: BagItem) => void;
}

const GalleryView = ({ bagItems, isOwnBag, onEquipmentClick }: GalleryViewProps) => {
  return (
    <div className="p-4">
      <div className="gallery-masonry">
        {bagItems.map((item, index) => (
          <GalleryTile 
            key={item.equipment.id}
            item={item}
            size={calculateDynamicSize(item, index)}
            isOwnBag={isOwnBag}
            onClick={() => onEquipmentClick(item)}
          />
        ))}
      </div>
    </div>
  );
};

// Dynamic sizing logic for visual rhythm
const calculateDynamicSize = (item: BagItem, index: number): string => {
  const patterns = ['square', 'tall', 'wide', 'large', 'vertical', 'horizontal'];
  
  // Special sizing for featured items
  if (item.equipment.category === 'bag') return 'large';
  if (item.equipment.category === 'driver' && item.isFeatured) return 'tall';
  if (item.equipment.category === 'putter' && item.isFeatured) return 'wide';
  
  // Create visual rhythm
  return patterns[index % patterns.length];
};

interface GalleryTileProps {
  item: BagItem;
  size: string;
  isOwnBag: boolean;
  onClick: () => void;
}

const GalleryTile = ({ item, size, isOwnBag, onClick }: GalleryTileProps) => {
  const sizeClasses = {
    square: 'tile-square',
    tall: 'tile-tall',
    wide: 'tile-wide',
    large: 'tile-large',
    vertical: 'tile-vertical',
    horizontal: 'tile-horizontal'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size as keyof typeof sizeClasses]}
        relative overflow-hidden cursor-pointer group
        bg-gradient-to-br from-gray-900 to-black
        hover:scale-[1.02] transition-transform duration-300
      `}
      onClick={onClick}
    >
      {/* Equipment Image */}
      <img 
        src={item.equipment.image} 
        alt={`${item.equipment.brand} ${item.equipment.model}`}
        className="w-full h-full object-cover"
        style={{ 
          objectPosition: 'center',
          filter: 'brightness(0.9) contrast(1.1)'
        }}
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Equipment Info - Only on larger tiles */}
        {(size === 'large' || size === 'wide' || size === 'tall') && (
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="font-semibold text-sm">{item.equipment.brand}</h3>
            <p className="text-xs opacity-80">{item.equipment.model}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          {item.isFeatured && (
            <div className="w-8 h-8 bg-accent/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Star className="w-4 h-4 text-accent fill-current" />
            </div>
          )}
          {isOwnBag && (
            <button 
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit action
              }}
            >
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryView;