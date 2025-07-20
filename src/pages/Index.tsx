import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FloatingActionButton from "@/components/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Camera, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { BagCard } from "@/components/bags/BagCard";
import { getBags } from "@/services/bags";
import { getEquipment } from "@/services/equipment";
import type { Database } from "@/lib/supabase";

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  equipment_photos?: any[];
  primaryPhoto?: string;
};
type Bag = any; // Using any since getBags returns a complex type

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [topBags, setTopBags] = useState<Bag[]>([]);
  const [stats, setStats] = useState({
    totalBags: 0,
    totalEquipment: 0,
    totalPhotos: 0,
    totalPosts: 0
  });
  
  // Hero equipment images for carousel - using database equipment images
  const heroImages = equipment.slice(0, 4).map(eq => eq.image_url).filter(Boolean) as string[];

  // Load data
  useEffect(() => {
    console.log('Index page mounted, loading data...');
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load all data...');
      
      const results = await Promise.allSettled([
        loadEquipment(),
        loadTopBags(),
        loadStats()
      ]);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to load data ${index}:`, result.reason);
        }
      });
      
      console.log('All data loading completed');
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadEquipment = async () => {
    try {
      console.log('Loading equipment...');
      // Get popular equipment using the service
      const allEquipment = await getEquipment({ sortBy: 'popular' });
      
      if (!allEquipment || allEquipment.length === 0) {
        console.log('No equipment found');
        setEquipment([]);
        return;
      }
      
      // Filter to get one from each category that has an image
      const categories = ['driver', 'putter', 'wedges', 'hybrid', 'irons', 'fairway_wood'];
      const equipmentByCategory: Equipment[] = [];
      
      categories.forEach(category => {
        // Find the first equipment in this category that has an image
        const equipmentWithImage = allEquipment.find(eq => 
          eq.category === category && 
          (eq.image_url || (eq.equipment_photos && eq.equipment_photos.length > 0))
        );
        
        if (equipmentWithImage) {
          equipmentByCategory.push(equipmentWithImage);
        }
      });
      
      console.log('Loaded equipment with images:', equipmentByCategory.length, 'items');
      setEquipment(equipmentByCategory);
    } catch (error) {
      console.error('Error loading equipment:', error);
      throw error;
    }
  };
  
  const loadTopBags = async () => {
    try {
      console.log('Loading top bags...');
      // Use the existing getBags service with most-liked sorting
      const bags = await getBags({ sortBy: 'most-liked' });
      
      console.log('Loaded bags:', bags?.length || 0, 'bags');
      
      if (bags && bags.length > 0) {
        // Take only the top 3 bags
        setTopBags(bags.slice(0, 3));
      } else {
        setTopBags([]);
      }
    } catch (error) {
      console.error('Error loading top bags:', error);
      throw error;
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading stats...');
      // Get real stats from database with correct table names
      const [bagsCount, equipmentCount, photosCount, postsCount] = await Promise.all([
        supabase.from('user_bags').select('*', { count: 'exact', head: true }),
        supabase.from('equipment').select('*', { count: 'exact', head: true }),
        supabase.from('equipment_photos').select('*', { count: 'exact', head: true }),
        supabase.from('feed_posts').select('*', { count: 'exact', head: true })
      ]);

      const stats = {
        totalBags: bagsCount.count || 0,
        totalEquipment: equipmentCount.count || 0,
        totalPhotos: photosCount.count || 0,
        totalPosts: postsCount.count || 0
      };
      
      console.log('Stats loaded:', stats);
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (heroImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroImages.length]);

  // Parallax scroll hook
  const { scrollY } = useScroll();
  const heroTextY = useTransform(scrollY, [0, 500], [0, -100]);

  const handleBuildBagClick = () => {
    if (user) {
      navigate('/my-bag');
    } else {
      setShowSignIn(true);
    }
  };

  const handleExploreBagsClick = () => {
    navigate('/bags');
  };

  // Equipment category icons
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'driver': '🏌️',
      'irons': '⚡',
      'putter': '🏁',
      'wedges': '🎯',
      'fairway_wood': '🌲',
      'hybrid': '🔄',
      'golf_ball': '⚪'
    };
    return iconMap[category] || '🏌️';
  };

  // Stats data - Real data from database
  const statsData = [
    { value: `${stats.totalBags}`, label: "Bags Shared" },
    { value: `${stats.totalEquipment}+`, label: "Clubs in Database" },
    { value: `${stats.totalPhotos}`, label: "Community Photos" },
    { value: `${stats.totalPosts}`, label: "Gear Discussions" }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      {/* Dynamic Hero Section with Equipment Carousel */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="h-[60vh] relative overflow-hidden bg-black"
      >
        {/* Auto-scrolling Equipment Carousel Background */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            </div>
          ) : heroImages.length > 0 ? (
            heroImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="w-full h-full overflow-hidden">
                  <img 
                    src={image}
                    className="w-full h-full object-cover animate-ken-burns filter brightness-50"
                    alt=""
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
          )}
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
        </div>

        {/* Hero Content with Parallax Effect */}
        <motion.div 
          className="relative z-10 h-full flex flex-col justify-center items-center px-4"
          style={{ y: heroTextY }}
        >
          <div className="text-center max-w-4xl">
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Your Bag, Your Story
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Share your golf setup. Connect with fellow golfers. Build the ultimate gear community.
            </motion.p>

            {/* Updated CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Button
                onClick={handleBuildBagClick}
                className="bg-[#10B981] hover:bg-[#0ea674] px-8 py-4 text-lg font-bold hover:scale-105 transition-transform"
              >
                Build Your Bag
              </Button>
              <button 
                onClick={handleExploreBagsClick}
                className="px-8 py-4 bg-white/10 backdrop-blur-[10px] text-white font-medium rounded-lg border border-white/30 hover:bg-white/20 transition-colors"
              >
                Explore Bags
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Top Bags Section - Using Real BagCard Components */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Top Bags
            </h2>
            <p className="text-gray-400 text-lg">
              Most teed bags from our community
            </p>
          </motion.div>

          {/* Top 3 Bags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <>
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
              </>
            ) : topBags.length > 0 ? (
              topBags.map((bag, index) => (
                <motion.div
                  key={bag.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <BagCard bag={bag} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-400">No bags available yet. Be the first to create one!</p>
              </div>
            )}
          </div>

          {/* Popular Equipment Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Popular Equipment</h3>
            
            {/* Horizontal Scrolling Equipment Cards */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {equipment.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    onClick={() => navigate(`/equipment/${item.id}`)}
                    className="flex-shrink-0 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                  >
                    {/* Equipment Image */}
                    <div className="aspect-square bg-[#0a0a0a] rounded-lg mb-3 overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url}
                          alt={`${item.brand} ${item.model}`}
                          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {getCategoryIcon(item.category)}
                        </div>
                      )}
                    </div>
                    
                    {/* Equipment Info */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium text-sm">{item.brand}</h4>
                      <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    </div>
                    <p className="text-gray-300 text-xs mb-2 line-clamp-1">{item.model}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs capitalize">{item.category.replace('_', ' ')}</span>
                      {item.msrp && (
                        <span className="text-[#10B981] font-bold text-sm">${item.msrp}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section with Real Data */}
      <section className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {statsData.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="text-3xl font-bold text-[#10B981] mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features Section */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-4">Join the Community</h2>
            <p className="text-gray-400">Connect with golfers who share your passion for the game and gear</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-bold mb-2">Share Your Setup</h3>
              <p className="text-gray-400 text-sm">Showcase your clubs with photos and detailed specs</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-bold mb-2">Discuss Equipment</h3>
              <p className="text-gray-400 text-sm">Join forums to talk about gear, tips, and experiences</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-bold mb-2">Follow Other Golfers</h3>
              <p className="text-gray-400 text-sm">See what's in the bags of players you admire</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative overflow-hidden bg-black">
        <motion.div 
          className="relative z-10 max-w-4xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-display font-bold text-white mb-6">
            Ready to Show Your Bag?
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join the growing community of golf gear enthusiasts
          </p>

          <Button 
            onClick={handleBuildBagClick}
            className="bg-[#10B981] hover:bg-[#0ea674] px-12 py-5 text-xl hover:scale-105 transition-transform"
          >
            Get Started
          </Button>
        </motion.div>
      </section>
      
      {/* Floating Action Button */}
      <FloatingActionButton />
      
      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
      />
    </div>
  );
};

export default Index;