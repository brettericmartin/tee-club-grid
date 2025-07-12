import { Star, X } from 'lucide-react';
import { BagItem } from '@/types/equipment';

interface ListViewProps {
  bagItems: BagItem[];
  isOwnBag: boolean;
  onEquipmentClick: (item: BagItem) => void;
  onRemoveItem?: (itemId: string) => void;
}

const ListView = ({ bagItems, isOwnBag, onEquipmentClick, onRemoveItem }: ListViewProps) => {
  return (
    <div className="p-6 space-y-2">
      {bagItems.map(item => (
        <div 
          key={item.equipment.id}
          className="gel-card rounded-xl p-4 hover:bg-white/15 transition-colors cursor-pointer group"
          onClick={() => onEquipmentClick(item)}
        >
          <div className="flex items-center gap-4">
            {/* Equipment Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-black flex-shrink-0">
              <img 
                src={item.equipment.image} 
                alt={`${item.equipment.brand} ${item.equipment.model}`}
                className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-[mix-blend-mode] duration-300"
                loading="lazy"
              />
            </div>
            
            {/* Equipment Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium text-base">
                  {item.equipment.brand} {item.equipment.model}
                </h3>
                {item.isFeatured && (
                  <Star className="w-4 h-4 text-accent fill-current flex-shrink-0" />
                )}
              </div>
              <p className="text-white/60 text-sm">
                {item.equipment.category} 
                {item.equipment.customSpecs && ` • ${item.equipment.customSpecs}`}
              </p>
            </div>
            
            {/* Specs - Shaft/Grip */}
            <div className="hidden md:flex gap-3 flex-shrink-0">
              {item.equipment.specs?.shaft && (
                <div className="px-3 py-1 bg-white/5 rounded-full text-white/70 text-sm border border-white/10">
                  {item.equipment.specs.shaft.model} {item.equipment.specs.shaft.flex}
                </div>
              )}
              {item.equipment.specs?.grip && (
                <div className="px-3 py-1 bg-white/5 rounded-full text-white/70 text-sm border border-white/10">
                  {item.equipment.specs.grip.model}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwnBag && onRemoveItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.equipment.id);
                  }}
                  className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                  aria-label="Remove from bag"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListView;