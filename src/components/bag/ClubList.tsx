import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Star, ExternalLink, Info, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ClubListProps {
  equipment: Array<{
    id: string;
    equipment_id: string;
    is_featured: boolean;
    purchase_price?: number;
    loft?: string;
    custom_specs?: any;
    custom_photo_url?: string;
    equipment: {
      id: string;
      brand: string;
      model: string;
      category: string;
      image_url?: string;
      msrp?: number;
    };
    shaft?: {
      brand: string;
      model: string;
      flex?: string;
      weight?: string;
    };
    grip?: {
      brand: string;
      model: string;
      size?: string;
    };
  }>;
  isOwner: boolean;
}

const CATEGORY_ORDER = [
  "driver",
  "fairway_wood",
  "hybrid",
  "iron",
  "wedge",
  "putter",
  "ball",
  "bag",
  "glove",
  "rangefinder",
  "gps",
  "accessories",
];

const CATEGORY_LABELS: Record<string, string> = {
  driver: "Driver",
  fairway_wood: "Fairway Woods",
  hybrid: "Hybrids",
  iron: "Irons",
  wedge: "Wedges",
  putter: "Putter",
  ball: "Golf Balls",
  bag: "Golf Bag",
  glove: "Gloves",
  rangefinder: "Rangefinder",
  gps: "GPS Device",
  accessories: "Accessories",
};const ClubCard = ({ item, isOwner }: { item: ClubListProps["equipment"][0]; isOwner: boolean }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.custom_photo_url || item.equipment.image_url;
  const price = item.purchase_price || item.equipment.msrp;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      className={cn(
        "group relative flex gap-4 p-4 rounded-xl",
        "bg-[#1A1A1A]",
        "border border-white/10",
        "hover:border-[#10B981]/20 hover:bg-[#2A2A2A]",
        "transition-all duration-300"
      )}
    >
      {/* Featured Badge */}
      {item.is_featured && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Featured
          </Badge>
        </div>
      )}
      
      {/* Equipment Image */}
      <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-[#2A2A2A]">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={`${item.equipment.brand} ${item.equipment.model}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-[#FAFAFA]/30" />
          </div>
        )}
      </div>
      
      {/* Equipment Details */}
      <div className="flex-1 space-y-2">
        {/* Brand and Model */}
        <div>
          <h4 className="text-lg font-semibold text-white group-hover:text-[#10B981] transition-colors">
            {item.equipment.brand} {item.equipment.model}
          </h4>
          {item.loft && (
            <span className="text-[#FAFAFA]/60 text-sm">{item.loft}°</span>
          )}
        </div>
        
        {/* Specs */}
        <div className="space-y-1 text-sm">
          {item.shaft && (
            <div className="flex items-center gap-2 text-[#FAFAFA]/50">
              <span className="font-medium">Shaft:</span>
              <span>
                {item.shaft.brand} {item.shaft.model}
                {item.shaft.flex && ` - ${item.shaft.flex}`}
                {item.shaft.weight && ` (${item.shaft.weight})`}
              </span>
            </div>
          )}
          {item.grip && (
            <div className="flex items-center gap-2 text-[#FAFAFA]/50">
              <span className="font-medium">Grip:</span>
              <span>
                {item.grip.brand} {item.grip.model}
                {item.grip.size && ` - ${item.grip.size}`}
              </span>
            </div>
          )}
        </div>
        
        {/* Price and Action */}
        <div className="flex items-center justify-between pt-2">
          {price && (
            <span className="text-[#10B981] font-semibold">
              {formatCompactCurrency(price)}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-[#10B981] hover:text-white hover:bg-[#10B981]/10"
            onClick={() => navigate(`/equipment/${item.equipment_id}`)}
          >
            View Details
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};const ClubList = ({ equipment, isOwner }: ClubListProps) => {
  // Group equipment by category
  const groupedEquipment = equipment.reduce((acc, item) => {
    const category = item.equipment.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof equipment>);
  
  // Sort categories by predefined order
  const sortedCategories = Object.keys(groupedEquipment).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="text-2xl font-bold text-white">Equipment Details</h3>
        <Badge className="bg-[#2A2A2A] text-[#10B981] border-white/10">
          {equipment.length} items
        </Badge>
      </motion.div>
      
      <Accordion
        type="multiple"
        defaultValue={sortedCategories.slice(0, 3)}
        className="space-y-3"
      >
        {sortedCategories.map((category, index) => {
          const items = groupedEquipment[category];
          const categoryLabel = CATEGORY_LABELS[category] || category;
          
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem
                value={category}
                className="border border-white/10 rounded-xl overflow-hidden bg-[#141414]"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-[#10B981]/5 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white">
                        {categoryLabel}
                      </span>
                      <Badge variant="secondary" className="bg-[#2A2A2A] text-[#10B981] border-0">
                        {items.length}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    {items.map((item, itemIndex) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: itemIndex * 0.05 }}
                      >
                        <ClubCard item={item} isOwner={isOwner} />
                      </motion.div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          );
        })}
      </Accordion>
    </div>
  );
};

export default ClubList;