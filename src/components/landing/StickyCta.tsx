import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface StickyCtaProps {
  onBuildBag: () => void;
  onExploreBags: () => void;
}

export const StickyCta = ({ onBuildBag, onExploreBags }: StickyCtaProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled past 40% of viewport height
      const scrollThreshold = window.innerHeight * 0.4;
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial scroll position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        >
          <div className="pointer-events-auto">
            {/* Gradient background blur */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-xl" />
            
            {/* Content container */}
            <div className="relative px-4 pb-6 pt-4">
              <div className="max-w-2xl mx-auto">
                {/* Mini promo text */}
                <motion.div 
                  className="text-center mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">
                      Limited beta access • Build My Bag for approved members
                    </span>
                  </div>
                </motion.div>
                
                {/* CTA buttons container */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                  {/* Primary CTA */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={onBuildBag}
                      size="lg"
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-5 text-base font-semibold shadow-lg shadow-emerald-500/25 group"
                    >
                      Apply for Beta
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                  
                  {/* Secondary CTA */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={onExploreBags}
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 px-6 py-5 text-base font-medium backdrop-blur-sm"
                    >
                      Explore Top Bags
                    </Button>
                  </motion.div>
                </div>
                
                {/* Progress indicator */}
                <motion.div 
                  className="mt-4 flex justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-8 h-1 rounded-full bg-emerald-500" />
                  <div className="w-8 h-1 rounded-full bg-white/20" />
                  <div className="w-8 h-1 rounded-full bg-white/20" />
                  <div className="w-8 h-1 rounded-full bg-white/20" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};