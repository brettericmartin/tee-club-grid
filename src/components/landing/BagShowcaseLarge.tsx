import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles, Star, Loader2, ExternalLink, MapPin, Trophy, Users, TrendingUp, Target, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import EquipmentTile from "@/components/shared/EquipmentTile";
import { formatCompactCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const BRETT_BAG_ID = "f506f87e-223e-4fa4-beee-f0094915a965";

interface BagEquipmentItem {
  id: string;
  bag_id: string;
  equipment_id: string;
  is_featured: boolean;
  purchase_price?: number;
  custom_photo_url?: string;
  equipment: {
    id: string;
    brand: string;
    model: string;
    category: string;
    image_url?: string;
    msrp?: number;
  };
}

interface BagData {
  id: string;
  name: string;
  background_image?: string;
  likes_count: number;
  views_count: number;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    handicap?: number;
    location?: string;
    title?: string;
  };
  bag_equipment?: BagEquipmentItem[];
}

export const BagShowcaseLarge = () => {
  const navigate = useNavigate();
  const [bag, setBag] = useState<BagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBagData();
  }, []);

  const fetchBagData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            handicap,
            location,
            title
          ),
          bag_equipment (
            id,
            bag_id,
            equipment_id,
            is_featured,
            purchase_price,
            custom_photo_url,
            equipment:equipment_id (
              id,
              brand,
              model,
              category,
              image_url,
              msrp
            )
          )
        `)
        .eq('id', BRETT_BAG_ID)
        .single();

      if (error) throw error;
      
      setBag(data as BagData);
    } catch (error) {
      console.error('Error fetching bag:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        </div>
      </section>
    );
  }

  if (!bag) {
    return null;
  }

  // Define club categories (same as BagCard)
  const CLUB_CATEGORIES = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
  const ACCESSORY_CATEGORIES = ['ball', 'glove', 'rangefinder', 'gps', 'tee', 'towel', 'bag', 'accessories'];
  
  const allEquipment = bag.bag_equipment || [];
  
  // Find golf bag
  const golfBag = allEquipment.find(item => 
    item.equipment && item.equipment.category === 'bag'
  );
  
  const golfBagImage = golfBag?.custom_photo_url || golfBag?.equipment?.image_url;
  
  // Separate clubs and accessories (same logic as BagCard)
  const clubs = allEquipment.filter(item => 
    item.equipment && CLUB_CATEGORIES.includes(item.equipment.category)
  );
  const accessories = allEquipment.filter(item => 
    item.equipment && ACCESSORY_CATEGORIES.includes(item.equipment.category)
  );
  
  // Include bag in clubs if featured and less than 6 featured clubs
  const featuredClubs = clubs.filter(item => item.is_featured);
  const shouldIncludeBagInClubs = golfBag?.is_featured && featuredClubs.length < 6;
  
  if (golfBag) {
    if (shouldIncludeBagInClubs) {
      if (!clubs.find(item => item.id === golfBag.id)) {
        clubs.push(golfBag);
      }
    } else {
      if (!accessories.find(item => item.id === golfBag.id)) {
        accessories.push(golfBag);
      }
    }
  }
  
  // Sort by featured first
  const sortEquipment = (items: BagEquipmentItem[]) => 
    items.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return 0;
    });
  
  // Get SAME counts as regular BagCard - 6 clubs, 4 accessories
  const displayClubs = sortEquipment([...clubs]).slice(0, 6);
  const displayAccessories = sortEquipment([...accessories]).slice(0, 4);
  
  // Calculate total value
  const totalValue = allEquipment.reduce((sum, item) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;

  const getEquipmentImage = (item: BagEquipmentItem) => {
    if (item.custom_photo_url && !imageError[`${item.id}-custom`]) {
      return item.custom_photo_url;
    }
    if (item.equipment?.image_url && !imageError[`${item.id}-equipment`]) {
      return item.equipment.image_url;
    }
    return null;
  };

  // Count equipment by category
  const categoryCount = allEquipment.reduce((acc, item) => {
    const category = item.equipment?.category;
    if (category) {
      if (CLUB_CATEGORIES.includes(category)) {
        acc.clubs++;
      } else {
        acc.accessories++;
      }
    }
    return acc;
  }, { clubs: 0, accessories: 0 });

  // Get unique brands
  const uniqueBrands = [...new Set(allEquipment.map(item => item.equipment?.brand).filter(Boolean))];

  return (
    <section className="py-24 bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-400 font-medium">Example Bag</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            This is What Your Bag Could Look Like
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Every bag tells a story. Here's how we showcase equipment, track stats, and help you share your setup with the community.
          </p>
        </motion.div>

        {/* Side-by-side layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left side - Details and Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Player Profile Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl border border-white/10 p-6">
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
                  <AvatarImage src={bag.profiles?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xl">
                    {bag.profiles?.display_name?.charAt(0) || 'B'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white">{bag.profiles?.display_name || 'Brett Martin'}</h3>
                  <p className="text-white/60 flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {bag.profiles?.location || 'Phoenix, AZ'}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Founder
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Target className="w-3 h-3 mr-1" />
                      {bag.profiles?.handicap || '8.2'} HCP
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Bag Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{formatCompactCurrency(totalValue)}</div>
                    <div className="text-xs text-white/50">Total Value</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{allEquipment.length}</div>
                    <div className="text-xs text-white/50">Total Pieces</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{categoryCount.clubs}/{categoryCount.accessories}</div>
                    <div className="text-xs text-white/50">Clubs/Accessories</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{uniqueBrands.length}</div>
                    <div className="text-xs text-white/50">Brands</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Key Features */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-xl border border-white/10 p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                What You Can Do
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-white/90 font-medium">Track Your Equipment</p>
                    <p className="text-white/50 text-sm">Add all your clubs, balls, and accessories with photos</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-white/90 font-medium">Monitor Total Value</p>
                    <p className="text-white/50 text-sm">See what your setup is worth and track investments</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-white/90 font-medium">Share with Community</p>
                    <p className="text-white/50 text-sm">Get feedback and discover what others are playing</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/my-bag')}
              size="lg"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold shadow-lg shadow-emerald-500/25"
            >
              Create Your Own Bag
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          {/* Right side - Bag Card (matched to left side height) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center lg:justify-start items-start"
          >
            {/* Responsive wrapper - no scaling on mobile, scale on desktop */}
            <div className="w-full max-w-[360px] sm:max-w-[400px] lg:max-w-none lg:transform lg:scale-[1.75] lg:origin-top-left lg:ml-16 lg:mt-8">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-2xl w-full lg:w-[320px]">
                {/* Background with glassmorphic effect */}
                <div className="absolute inset-0">
                  {golfBagImage && !imageError['golf-bag'] ? (
                    <>
                      <img 
                        src={golfBagImage} 
                        alt="Golf Bag"
                        className="w-full h-full object-cover object-center"
                        onError={() => setImageError(prev => ({ ...prev, 'golf-bag': true }))}
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                      <div className="absolute inset-0 bg-black/40" />
                    </div>
                  )}
                </div>

                {/* Card Content - EXACTLY like BagCard */}
                <div className="relative p-4 min-h-[400px]">
                  {/* Header with user info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white/20">
                        <AvatarImage src={bag.profiles?.avatar_url} />
                        <AvatarFallback className="bg-primary/20 text-white">
                          {bag.profiles?.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {bag.profiles?.display_name || bag.profiles?.username || 'Unknown'} • {bag.name}
                        </h3>
                        {bag.profiles?.title && (
                          <p className="text-xs text-white/70">
                            {bag.profiles.title}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Hot
                    </Badge>
                  </div>

                  {/* 3x2 Clubs Grid - SAME as BagCard */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Array.from({ length: 6 }).map((_, index) => {
                      const item = displayClubs[index];
                      const imageUrl = item ? getEquipmentImage(item) : null;
                      
                      return (
                        <div key={index} className="relative group/item aspect-square">
                          {item ? (
                            <>
                              <EquipmentTile
                                equipment={{
                                  ...item.equipment,
                                  image_url: imageUrl || undefined
                                }}
                                size="lg"
                                showPhotoCount={false}
                                className="w-full h-full"
                              />
                              
                              {item.is_featured && (
                                <div className="absolute top-1 right-1 z-10">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-lg z-20 pointer-events-none">
                                <p className="text-white text-xs text-center line-clamp-2">
                                  {item.equipment?.brand} {item.equipment?.model}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="aspect-square rounded-lg bg-[#1a1a1a]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Accessories Row - 4 items SAME as BagCard */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {Array.from({ length: 4 }).map((_, index) => {
                      const item = displayAccessories[index];
                      const imageUrl = item ? getEquipmentImage(item) : null;
                      
                      return (
                        <div key={`acc-${index}`} className="relative group/item">
                          {item ? (
                            <>
                              <EquipmentTile
                                equipment={{
                                  ...item.equipment,
                                  image_url: imageUrl || undefined
                                }}
                                size="sm"
                                showPhotoCount={false}
                                className="w-full h-full"
                              />
                              
                              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-lg z-20 pointer-events-none">
                                <p className="text-white text-[10px] text-center line-clamp-2">
                                  {item.equipment?.brand} {item.equipment?.model}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="aspect-square rounded-lg bg-[#1a1a1a]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Section */}
                  <div className="space-y-3">
                    {/* Stats bar */}
                    <div className="flex items-center gap-4 text-white/90 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{allEquipment.length}</span>
                        <span className="text-xs text-white/70">pieces</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{formatCompactCurrency(totalValue)}</span>
                        <span className="text-xs text-white/70">value</span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <Button
                      onClick={() => navigate(`/bag/${bag.id}`)}
                      variant="outline"
                      size="sm"
                      className="w-full bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#3a3a3a] group h-9 text-sm"
                    >
                      <span>View Full Bag</span>
                      <ExternalLink className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};