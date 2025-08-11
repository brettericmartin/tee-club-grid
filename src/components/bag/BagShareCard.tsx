import { forwardRef } from "react";
import { formatCompactCurrency } from "@/lib/formatters";

interface BagShareCardProps {
  bag: {
    name: string;
    profiles?: {
      display_name?: string;
      username?: string;
      avatar_url?: string;
    };
    bag_equipment?: Array<{
      equipment: {
        brand: string;
        model: string;
        image_url?: string;
        category: string;
      };
    }>;
    likes_count?: number;
  };
}

// This component is designed to be captured as an image
const BagShareCard = forwardRef<HTMLDivElement, BagShareCardProps>(({ bag }, ref) => {
  // Get unique brands
  const brands = [...new Set(bag.bag_equipment?.map(item => item.equipment.brand) || [])];
  
  // Get club count
  const clubCount = bag.bag_equipment?.filter(item => 
    ["driver", "fairway_wood", "hybrid", "iron", "wedge", "putter"].includes(item.equipment.category)
  ).length || 0;
  
  // Get featured equipment (first 6 items with images)
  const featuredEquipment = bag.bag_equipment
    ?.filter(item => item.equipment.image_url)
    .slice(0, 6) || [];

  return (
    <div
      ref={ref}
      className="w-[600px] h-[600px] bg-gradient-to-br from-gray-900 via-black to-green-950 p-8 flex flex-col"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {bag.profiles?.avatar_url ? (
            <img
              src={bag.profiles.avatar_url}
              alt={bag.profiles.display_name || bag.profiles.username}
              className="w-16 h-16 rounded-full border-2 border-green-500"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-500">
                {(bag.profiles?.display_name || bag.profiles?.username || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {bag.profiles?.display_name || bag.profiles?.username || 'Golf Bag'}
            </h2>
            <p className="text-green-400 text-lg">{bag.name}</p>
          </div>
        </div>
        
        {/* Teed.club Logo */}
        <div className="text-right">
          <div className="text-green-500 font-bold text-xl">Teed.club</div>
          <div className="text-gray-400 text-sm">Golf Bag Showcase</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-black/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{clubCount}</p>
          <p className="text-gray-400 text-sm">Clubs</p>
        </div>
        <div className="bg-black/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{brands.length}</p>
          <p className="text-gray-400 text-sm">Brands</p>
        </div>
        <div className="bg-black/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{bag.likes_count || 0}</p>
          <p className="text-gray-400 text-sm">Tees</p>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="flex-1 bg-black/30 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3 h-full">
          {featuredEquipment.map((item, index) => (
            <div
              key={index}
              className="bg-gray-900/50 rounded-lg p-3 flex flex-col items-center justify-center"
            >
              {item.equipment.image_url && (
                <img
                  src={item.equipment.image_url}
                  alt={`${item.equipment.brand} ${item.equipment.model}`}
                  className="w-20 h-20 object-contain mb-2"
                />
              )}
              <p className="text-white text-xs font-semibold text-center">
                {item.equipment.brand}
              </p>
              <p className="text-gray-400 text-xs text-center line-clamp-1">
                {item.equipment.model}
              </p>
            </div>
          ))}
          
          {/* Fill empty slots */}
          {Array.from({ length: Math.max(0, 6 - featuredEquipment.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-900/20 rounded-lg"
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-gray-400 text-sm">View full bag at Teed.club</p>
        </div>
        
        {/* QR Code placeholder */}
        <div className="bg-white p-2 rounded">
          <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
            QR
          </div>
        </div>
      </div>
    </div>
  );
});

BagShareCard.displayName = 'BagShareCard';

export default BagShareCard;