import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Button } from "@/components/ui/button";
import { ChevronRight, TrendingUp, Star, Award, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCompactCurrency } from "@/lib/formatters";
import topTeedEquipmentData from "@/data/topTeedEquipment.json";

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
  msrp?: number;
  release_year?: number;
  popularity_score?: number;
  equipment_photos?: Array<{
    id: string;
    photo_url: string;
    is_primary: boolean;
  }>;
}

interface EquipmentWithStats extends Equipment {
  teesCount?: number;
  usersCount?: number;
  avgRating?: number;
  badge?: "Most Teed" | "Pro Choice" | "Best Value";
}

const categories = [
  { value: "all", label: "All Gear" },
  { value: "driver", label: "Drivers" },
  { value: "iron", label: "Irons" },
  { value: "wedge", label: "Wedges" },
  { value: "putter", label: "Putters" },
  { value: "ball", label: "Balls" }
];

interface GearGridProps {
  onViewDetails: (id: string) => void;
  onBrowseAll: () => void;
}

export const GearGrid = ({ onViewDetails, onBrowseAll }: GearGridProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
  const [equipment, setEquipment] = useState<EquipmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      let processedEquipment: EquipmentWithStats[] = [];
      
      // First try to use pre-generated top teed equipment data
      if (topTeedEquipmentData && topTeedEquipmentData.equipment.length > 0) {
        console.log('Using pre-generated top teed equipment data');
        
        // Process the pre-generated data
        processedEquipment = topTeedEquipmentData.equipment.map((eq, index) => {
          // Assign badges to top items
          let badge: "Most Teed" | "Pro Choice" | "Best Value" | undefined;
          
          if (index === 0) {
            badge = "Most Teed";
          } else if (index < 3 && ['Titleist', 'TaylorMade', 'Callaway'].includes(eq.brand)) {
            badge = "Pro Choice";
          } else if (index < 5 && eq.msrp && eq.msrp < 300) {
            badge = "Best Value";
          }
          
          return {
            ...eq,
            teesCount: eq.totalTees,
            usersCount: eq.photoCount * 3, // Estimate users
            avgRating: 4.2 + Math.min(eq.totalTees / 10, 0.7), // 4.2-4.9 range
            badge
          };
        });
      }
      
      // If we don't have enough teed equipment, supplement with popular equipment
      if (processedEquipment.length < 8) {
        console.log(`Only ${processedEquipment.length} teed items, fetching additional popular equipment`);
        
        const { data: popularEquipment, error } = await supabase
          .from('equipment')
          .select(`
            *,
            equipment_photos (
              id,
              photo_url,
              is_primary
            )
          `)
          .in('category', ['driver', 'iron', 'wedge', 'putter', 'ball', 'fairway_wood'])
          .order('popularity_score', { ascending: false })
          .limit(20);
        
        if (!error && popularEquipment) {
          // Add popular equipment that's not already in our list
          const existingIds = new Set(processedEquipment.map(eq => eq.id));
          
          const additionalEquipment = popularEquipment
            .filter(eq => !existingIds.has(eq.id) && eq.equipment_photos?.length > 0)
            .slice(0, 8 - processedEquipment.length)
            .map(eq => {
              const primaryPhoto = eq.equipment_photos?.find((p: any) => p.is_primary);
              const firstPhoto = eq.equipment_photos?.[0];
              
              return {
                ...eq,
                image_url: primaryPhoto?.photo_url || firstPhoto?.photo_url || eq.image_url,
                teesCount: 0,
                usersCount: Math.floor(Math.random() * 10 + 1),
                avgRating: 4.0 + (eq.popularity_score || 50) / 100,
                badge: undefined as "Most Teed" | "Pro Choice" | "Best Value" | undefined
              };
            });
          
          processedEquipment = [...processedEquipment, ...additionalEquipment];
        }
      }
      
      if (processedEquipment.length > 0) {
        setEquipment(processedEquipment);
        setLoading(false);
        return;
      }
      
      // Fallback: If no pre-generated data, fetch from database
      console.log('Falling back to live data');
      
      // Get top teed photos with equipment
      const { data: topPhotos, error } = await supabase
        .from('equipment_photos')
        .select(`
          id,
          photo_url,
          likes_count,
          equipment_id,
          equipment:equipment_id (
            id,
            brand,
            model,
            category,
            image_url,
            msrp,
            release_year
          )
        `)
        .gt('likes_count', 0)
        .not('equipment_id', 'is', null)
        .order('likes_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by equipment and sum tees
      const equipmentMap = new Map();
      
      topPhotos?.forEach(photo => {
        if (photo.equipment) {
          const equipmentId = photo.equipment.id;
          
          if (!equipmentMap.has(equipmentId)) {
            equipmentMap.set(equipmentId, {
              ...photo.equipment,
              image_url: photo.photo_url || photo.equipment.image_url,
              teesCount: 0,
              photoCount: 0
            });
          }
          
          const equipment = equipmentMap.get(equipmentId);
          equipment.teesCount += photo.likes_count || 0;
          equipment.photoCount += 1;
        }
      });

      // Convert to array and sort
      processedEquipment = Array.from(equipmentMap.values())
        .sort((a, b) => b.teesCount - a.teesCount)
        .slice(0, 24)
        .map((eq, index) => {
          // Assign badges
          let badge: "Most Teed" | "Pro Choice" | "Best Value" | undefined;
          
          if (index === 0) {
            badge = "Most Teed";
          } else if (index < 3 && ['Titleist', 'TaylorMade', 'Callaway'].includes(eq.brand)) {
            badge = "Pro Choice";
          } else if (index < 5 && eq.msrp && eq.msrp < 300) {
            badge = "Best Value";
          }
          
          return {
            ...eq,
            usersCount: eq.photoCount * 3,
            avgRating: 4.2 + Math.min(eq.teesCount / 10, 0.7),
            badge
          };
        });

      setEquipment(processedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredGear = useMemo(() => {
    if (selectedCategories.includes("all") || selectedCategories.length === 0) {
      return equipment.slice(0, 8); // Show 8 items
    }
    return equipment
      .filter(item => selectedCategories.includes(item.category))
      .slice(0, 8);
  }, [selectedCategories, equipment]);

  const handleCategoryChange = (value: string[]) => {
    if (value.length === 0) {
      setSelectedCategories(["all"]);
    } else if (value.includes("all")) {
      setSelectedCategories(["all"]);
    } else {
      setSelectedCategories(value);
    }
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case "Most Teed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Pro Choice": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Best Value": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "";
    }
  };

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case "Most Teed": return <TrendingUp className="w-3 h-3" />;
      case "Pro Choice": return <Award className="w-3 h-3" />;
      case "Best Value": return <Star className="w-3 h-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <section className="py-24 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Discover Real Equipment
              </h2>
              <p className="text-lg text-white/60">
                Actual gear from our database, used by real golfers
              </p>
            </div>
            <Button
              onClick={onBrowseAll}
              variant="ghost"
              className="text-emerald-400 hover:text-emerald-300 group hidden md:flex"
            >
              Browse all
              <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Filter pills */}
          <ToggleGroup.Root
            type="multiple"
            value={selectedCategories}
            onValueChange={handleCategoryChange}
            className="flex flex-wrap gap-2"
          >
            {categories.map((category) => (
              <ToggleGroup.Item
                key={category.value}
                value={category.value}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${selectedCategories.includes(category.value)
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-transparent text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80"
                  }
                `}
              >
                {category.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </motion.div>

        {/* Gear grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredGear.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="group relative"
              >
                <div className="relative bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300">
                  {/* Badge */}
                  {item.badge && (
                    <div className={`absolute top-2 left-2 z-10 px-2 py-1 rounded-full border backdrop-blur-md flex items-center gap-1 ${getBadgeColor(item.badge)}`}>
                      {getBadgeIcon(item.badge)}
                      <span className="text-xs font-medium">{item.badge}</span>
                    </div>
                  )}
                  
                  {/* Image container */}
                  <div className="aspect-square bg-gradient-to-br from-[#1f1f1f] to-[#151515] p-4 flex items-center justify-center">
                    {item.image_url ? (
                      <img 
                        src={item.image_url}
                        alt={`${item.brand} ${item.model}`}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to placeholder if image fails
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Quick view overlay */}
                    <motion.div 
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                      initial={false}
                    >
                      <Button
                        onClick={() => onViewDetails(item.id)}
                        size="sm"
                        className="bg-white text-black hover:bg-white/90 font-medium"
                      >
                        Quick View
                      </Button>
                    </motion.div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="text-xs text-emerald-400 font-medium mb-1">{item.brand}</div>
                    <h3 className="text-white font-semibold mb-2 line-clamp-1">{item.model}</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {item.msrp && (
                          <div className="text-white/80 font-medium">{formatCompactCurrency(item.msrp)}</div>
                        )}
                        {item.avgRating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-white/50">{item.avgRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.teesCount && (
                        <div className="text-right">
                          <div className="text-xs text-white/40">Teed by</div>
                          <div className="text-sm text-emerald-400 font-medium">{item.teesCount.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Mobile browse all button */}
        <div className="mt-8 text-center md:hidden">
          <Button
            onClick={onBrowseAll}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Browse All Equipment
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};