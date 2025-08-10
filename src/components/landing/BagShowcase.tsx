import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import * as HoverCard from "@radix-ui/react-hover-card";
import { ChevronRight, Zap } from "lucide-react";

interface Hotspot {
  x: string;
  y: string;
  label: string;
  category: string;
  brand: string;
  href: string;
  price?: string;
  specs?: string;
}

const hotspots: Hotspot[] = [
  { 
    x: "18%", 
    y: "28%", 
    label: "Titleist TSR3 Driver", 
    category: "Driver",
    brand: "Titleist",
    href: "/equipment/titleist-tsr3-2023",
    price: "$599",
    specs: "9° • Stiff Flex"
  },
  { 
    x: "35%", 
    y: "35%", 
    label: "TaylorMade P790 Irons", 
    category: "Irons",
    brand: "TaylorMade",
    href: "/equipment/taylormade-p790",
    price: "$1,400",
    specs: "4-PW • Steel Shafts"
  },
  { 
    x: "52%", 
    y: "42%", 
    label: "Titleist Vokey SM10 52°", 
    category: "Wedge",
    brand: "Titleist",
    href: "/equipment/vokey-sm10",
    price: "$179",
    specs: "52° • F Grind"
  },
  { 
    x: "68%", 
    y: "48%", 
    label: "Scotty Cameron Newport 2", 
    category: "Putter",
    brand: "Scotty Cameron",
    href: "/equipment/scotty-newport-2",
    price: "$429",
    specs: "34\" • Pistolero Grip"
  },
  { 
    x: "82%", 
    y: "55%", 
    label: "Titleist Pro V1", 
    category: "Ball",
    brand: "Titleist",
    href: "/equipment/pro-v1",
    price: "$55/dozen",
    specs: "2024 Model"
  }
];

interface BagShowcaseProps {
  onViewFullBag: () => void;
}

export const BagShowcase = ({ onViewFullBag }: BagShowcaseProps) => {
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  return (
    <section className="py-24 bg-gradient-to-b from-black to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4">
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
            <span className="text-sm text-emerald-400 font-medium">Interactive Demo</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See a Bag in Action
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Here's Brett's Desert Summer 2025 bag. Every Teed.club bag is fully interactive — 
            click any club to see details, who plays it, and what they think.
          </p>
        </motion.div>

        {/* Interactive bag image with hotspots */}
        <motion.div 
          className="relative max-w-4xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Main bag card image */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-1">
            <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a]">
              <img 
                src="/MYBAG.png" 
                alt="Brett's Golf Bag"
                className="w-full h-auto"
              />
              
              {/* Gradient overlay for better hotspot visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              
              {/* Interactive hotspots */}
              {hotspots.map((hotspot, index) => (
                <HoverCard.Root key={index} openDelay={200}>
                  <HoverCard.Trigger asChild>
                    <motion.button
                      className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: hotspot.x, top: hotspot.y }}
                      onMouseEnter={() => setActiveHotspot(index)}
                      onMouseLeave={() => setActiveHotspot(null)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Pulsing ring */}
                      <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 group-hover:opacity-30 animate-ping" />
                      
                      {/* Main hotspot dot */}
                      <span className="relative flex h-full w-full items-center justify-center">
                        <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 group-hover:bg-emerald-400 transition-colors" />
                      </span>
                      
                      {/* Label on hover */}
                      <AnimatePresence>
                        {activeHotspot === index && (
                          <motion.div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 backdrop-blur-md rounded-lg whitespace-nowrap pointer-events-none"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                          >
                            <span className="text-xs text-white font-medium">{hotspot.label}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </HoverCard.Trigger>
                  
                  <HoverCard.Portal>
                    <HoverCard.Content
                      className="z-50 w-80 rounded-xl bg-[#1a1a1a] border border-white/10 p-4 shadow-2xl"
                      sideOffset={5}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Equipment card content */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-500">
                              {hotspot.category === "Driver" ? "D" :
                               hotspot.category === "Irons" ? "I" :
                               hotspot.category === "Wedge" ? "W" :
                               hotspot.category === "Putter" ? "P" : "B"}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-xs text-emerald-400 font-medium mb-1">{hotspot.category}</div>
                            <h3 className="text-white font-semibold mb-1">{hotspot.label}</h3>
                            <div className="text-sm text-white/60 mb-2">{hotspot.specs}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400 font-semibold">{hotspot.price}</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs text-white/70 hover:text-white"
                              >
                                View Details
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional info */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Played by 1,234 users</span>
                            <span className="text-emerald-400">★ 4.8 rating</span>
                          </div>
                        </div>
                      </motion.div>
                      
                      <HoverCard.Arrow className="fill-[#1a1a1a]" />
                    </HoverCard.Content>
                  </HoverCard.Portal>
                </HoverCard.Root>
              ))}
            </div>
          </div>
          
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-600/10 blur-3xl pointer-events-none" />
        </motion.div>

        {/* CTA button */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            onClick={onViewFullBag}
            size="lg"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-8 py-6 text-lg font-medium group"
          >
            View Full Bag
            <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          {/* Stats below button */}
          <div className="mt-6 flex items-center justify-center gap-8 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">15</span>
              <span>clubs in bag</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">$4,250</span>
              <span>total value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">327</span>
              <span>tees received</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};