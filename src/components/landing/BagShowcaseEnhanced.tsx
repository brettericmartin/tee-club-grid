import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import * as HoverCard from "@radix-ui/react-hover-card";
import { ChevronRight, Zap, MapPin, Trophy, Calendar, DollarSign, Star } from "lucide-react";

interface Hotspot {
  x: string;
  y: string;
  label: string;
  category: string;
  brand: string;
  href: string;
  price?: string;
  specs?: string;
  proUsage?: string;
}

// Brett's Desert Summer 2025 bag equipment
const hotspots: Hotspot[] = [
  { 
    x: "25%", 
    y: "20%", 
    label: "Titleist TSR3 Driver", 
    category: "Driver",
    brand: "Titleist",
    href: "/equipment/titleist-tsr3-2023",
    price: "$599",
    specs: "9° • HZRDUS Black 6.5",
    proUsage: "Used by Justin Thomas"
  },
  { 
    x: "35%", 
    y: "25%", 
    label: "Titleist TSR3 Fairway", 
    category: "Fairway Wood",
    brand: "Titleist",
    href: "/equipment/titleist-tsr3-fairway",
    price: "$349",
    specs: "15° • HZRDUS Black 7.5",
    proUsage: "Tour proven"
  },
  { 
    x: "45%", 
    y: "30%", 
    label: "Titleist T200 Irons", 
    category: "Irons",
    brand: "Titleist",
    href: "/equipment/titleist-t200",
    price: "$1,400",
    specs: "4-PW • Project X LZ 6.0",
    proUsage: "Player's distance iron"
  },
  { 
    x: "55%", 
    y: "35%", 
    label: "Vokey SM10 52°", 
    category: "Gap Wedge",
    brand: "Titleist",
    href: "/equipment/vokey-sm10-52",
    price: "$179",
    specs: "52°-08° F Grind",
    proUsage: "Most played wedge on Tour"
  },
  { 
    x: "60%", 
    y: "38%", 
    label: "Vokey SM10 56°", 
    category: "Sand Wedge",
    brand: "Titleist",
    href: "/equipment/vokey-sm10-56",
    price: "$179",
    specs: "56°-10° S Grind",
    proUsage: "Tour versatility"
  },
  { 
    x: "65%", 
    y: "41%", 
    label: "Vokey SM10 60°", 
    category: "Lob Wedge",
    brand: "Titleist",
    href: "/equipment/vokey-sm10-60",
    price: "$179",
    specs: "60°-04° L Grind",
    proUsage: "Precision scoring"
  },
  { 
    x: "75%", 
    y: "45%", 
    label: "Scotty Cameron Special Select Newport 2", 
    category: "Putter",
    brand: "Scotty Cameron",
    href: "/equipment/scotty-newport-2",
    price: "$449",
    specs: "34\" • SuperStroke Pistol GT",
    proUsage: "Tiger's choice"
  },
  { 
    x: "85%", 
    y: "50%", 
    label: "Pro V1x Golf Balls", 
    category: "Ball",
    brand: "Titleist",
    href: "/equipment/pro-v1x",
    price: "$55/dozen",
    specs: "2024 Model • High flight",
    proUsage: "#1 ball in golf"
  }
];

interface BagShowcaseEnhancedProps {
  onViewFullBag: () => void;
}

export const BagShowcaseEnhanced = ({ onViewFullBag }: BagShowcaseEnhancedProps) => {
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const bagStats = {
    owner: "Brett Martin",
    location: "Phoenix, AZ",
    handicap: "8.2",
    bagName: "Desert Summer 2025",
    totalValue: "$4,729",
    clubCount: "14",
    avgScore: "82",
    roundsPlayed: "47"
  };

  const filteredHotspots = selectedCategory 
    ? hotspots.filter(h => h.category === selectedCategory)
    : hotspots;

  return (
    <section className="py-24 bg-gradient-to-b from-black via-[#0a0a0a] to-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-400 font-medium">Featured Bag</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See a Championship Bag in Action
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Explore Brett's meticulously crafted Desert Summer 2025 setup. Every club tells a story of precision, 
            performance, and passion for the game.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bag owner info card */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl border border-white/10 p-6 h-full">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                  BM
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{bagStats.owner}</h3>
                  <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {bagStats.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">{bagStats.handicap}</div>
                  <div className="text-xs text-white/40">Handicap</div>
                </div>
              </div>

              <h4 className="text-lg font-semibold text-white mb-3">{bagStats.bagName}</h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-emerald-400 font-bold text-lg">{bagStats.totalValue}</div>
                    <div className="text-xs text-white/50">Total Value</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-emerald-400 font-bold text-lg">{bagStats.clubCount}</div>
                    <div className="text-xs text-white/50">Clubs</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-white font-bold text-lg">{bagStats.avgScore}</div>
                    <div className="text-xs text-white/50">Avg Score</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-white font-bold text-lg">{bagStats.roundsPlayed}</div>
                    <div className="text-xs text-white/50">Rounds (2024)</div>
                  </div>
                </div>

                {/* Quick category filters */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-white/50 mb-2">Quick Filter</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        !selectedCategory 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                          : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      All Clubs
                    </button>
                    {["Driver", "Irons", "Putter"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedCategory === cat 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Achievement badges */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-white/50 mb-2">Achievements</div>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interactive bag image with hotspots */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative">
              {/* Main bag card container */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-1">
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#141414] to-[#0a0a0a]">
                  {/* Bag image */}
                  <div className="relative aspect-[4/3]">
                    <img 
                      src="/MYBAG.png" 
                      alt="Brett's Desert Summer 2025 Bag"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient overlay for better hotspot visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Interactive hotspots */}
                    {filteredHotspots.map((hotspot, index) => (
                      <HoverCard.Root key={index} openDelay={100}>
                        <HoverCard.Trigger asChild>
                          <motion.button
                            className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 group"
                            style={{ left: hotspot.x, top: hotspot.y }}
                            onMouseEnter={() => setActiveHotspot(index)}
                            onMouseLeave={() => setActiveHotspot(null)}
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            {/* Pulsing ring */}
                            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 group-hover:opacity-40 animate-ping" />
                            
                            {/* Outer ring */}
                            <span className="absolute inset-2 rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50 group-hover:ring-emerald-400" />
                            
                            {/* Main hotspot dot */}
                            <span className="relative flex h-full w-full items-center justify-center">
                              <span className="h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 group-hover:bg-emerald-400 transition-colors" />
                            </span>
                            
                            {/* Label on hover */}
                            <AnimatePresence>
                              {activeHotspot === index && (
                                <motion.div
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-black/95 backdrop-blur-md rounded-lg whitespace-nowrap pointer-events-none z-20"
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                >
                                  <span className="text-xs text-white font-medium">{hotspot.label}</span>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </HoverCard.Trigger>
                        
                        <HoverCard.Portal>
                          <HoverCard.Content
                            className="z-50 w-96 rounded-xl bg-[#1a1a1a] border border-white/10 p-5 shadow-2xl"
                            sideOffset={5}
                          >
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {/* Equipment card content */}
                              <div className="flex items-start gap-4">
                                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                                  <span className="text-3xl font-bold text-emerald-500">
                                    {hotspot.category === "Driver" ? "D" :
                                     hotspot.category === "Fairway Wood" ? "F" :
                                     hotspot.category === "Irons" ? "I" :
                                     hotspot.category === "Putter" ? "P" :
                                     hotspot.category.includes("Wedge") ? "W" : "B"}
                                  </span>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                      {hotspot.category}
                                    </span>
                                    <span className="text-xs text-white/40">{hotspot.brand}</span>
                                  </div>
                                  <h3 className="text-white font-semibold text-lg mb-1">{hotspot.label}</h3>
                                  <div className="text-sm text-white/60 mb-3">{hotspot.specs}</div>
                                  
                                  {hotspot.proUsage && (
                                    <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-500/10 rounded-lg">
                                      <Trophy className="w-4 h-4 text-yellow-500" />
                                      <span className="text-xs text-yellow-400">{hotspot.proUsage}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-emerald-400 font-bold text-lg">{hotspot.price}</span>
                                    <Button 
                                      size="sm" 
                                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    >
                                      View Details
                                      <ChevronRight className="ml-1 h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Additional stats */}
                              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-white">2,341</div>
                                  <div className="text-xs text-white/40">Users own this</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-emerald-400">4.8</div>
                                  <div className="text-xs text-white/40">Avg rating</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-white">89%</div>
                                  <div className="text-xs text-white/40">Would rebuy</div>
                                </div>
                              </div>
                            </motion.div>
                            
                            <HoverCard.Arrow className="fill-[#1a1a1a]" />
                          </HoverCard.Content>
                        </HoverCard.Portal>
                      </HoverCard.Root>
                    ))}
                  </div>
                  
                  {/* Bag title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Desert Summer 2025</h3>
                    <p className="text-white/60 text-sm">Click any hotspot to explore the equipment</p>
                  </div>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-600/5 blur-3xl pointer-events-none" />
            </div>

            {/* CTA section */}
            <motion.div 
              className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center gap-6 text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span><span className="text-emerald-400 font-bold">{bagStats.totalValue}</span> total value</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span><span className="text-white font-bold">327</span> tees received</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  <span><span className="text-white font-bold">Top 5%</span> rated bag</span>
                </div>
              </div>
              
              <Button
                onClick={onViewFullBag}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 font-medium group shadow-lg shadow-emerald-500/25"
              >
                View Full Bag Details
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};