import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FloatingActionButton from "@/components/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Camera, Users } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { BagCard } from "@/components/bags/BagCard";
import { getBags } from "@/services/bags";
import { getEquipment } from "@/services/equipment";
import EquipmentCard from "@/components/shared/EquipmentCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { Database } from "@/lib/supabase";

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  equipment_photos?: Array<{
    id: string;
    photo_url: string;
    likes_count: number;
    is_primary: boolean;
  }>;
  primaryPhoto?: string;
  most_liked_photo?: string;
  savesCount?: number;
  totalLikes?: number;
};

type Bag = {
  id: string;
  name: string;
  bag_type?: string;
  background_image?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  views_count: number;
  user_id: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    handicap?: number;
    location?: string;
    title?: string;
  };
  bag_equipment?: Array<{
    id: string;
    position?: number;
    custom_photo_url?: string;
    purchase_price?: number;
    is_featured: boolean;
    equipment_id: string;
    equipment: Equipment;
  }>;
  totalValue?: number;
  likesCount?: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [topBags, setTopBags] = useState<Bag[]>([]);
  const [stats, setStats] = useState({
    totalBags: 0,
    totalEquipment: 0,
    totalPhotos: 0,
    totalPosts: 0
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Hero equipment images for carousel - using primaryPhoto from ranked equipment
  const heroImages = useMemo(() => {
    if (!Array.isArray(equipment)) return [];
    
    return equipment
      .filter(eq => eq && (eq.primaryPhoto || eq.image_url))
      .slice(0, 10)
      .map(eq => ({
        url: eq.primaryPhoto || eq.image_url || '',
        brand: eq.brand || '',
        model: eq.model || '',
        category: eq.category || ''
      }));
  }, [equipment]);

  // Load data
  useEffect(() => {
    console.log('Index page mounted, loading data...');
    const controller = new AbortController();
    setAbortController(controller);
    
    loadAllData();
    
    // Cleanup function
    return () => {
      console.log('Index page unmounting, aborting requests...');
      controller.abort();
    };
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load all data...');
      
      // Load data sequentially to better track errors
      try {
        await loadEquipment();
        console.log('Equipment loaded successfully');
      } catch (error) {
        console.error('Failed to load equipment:', error);
      }
      
      try {
        await loadTopBags();
        console.log('Top bags loaded successfully');
      } catch (error) {
        console.error('Failed to load top bags:', error);
      }
      
      try {
        await loadStats();
        console.log('Stats loaded successfully');
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
      
      console.log('All data loading completed');
    } catch (error) {
      console.error('Critical error loading page data:', error);
      // Set empty data as fallback
      setEquipment([]);
      setTopBags([]);
      setStats({
        totalBags: 0,
        totalEquipment: 0,
        totalPhotos: 0,
        totalPosts: 0
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadEquipment = async () => {
    try {
      console.log('Loading equipment...');
      
      // Always try popular equipment first for stability
      const allEquipment = await getEquipment({ sortBy: 'popular' });
      
      if (!allEquipment || allEquipment.length === 0) {
        console.log('No equipment found');
        setEquipment([]);
        return;
      }
      
      // Group by category
      const equipmentByCategory = allEquipment.reduce((acc, eq) => {
        if (!eq || !eq.category) return acc;
        if (!acc[eq.category]) acc[eq.category] = [];
        acc[eq.category].push(eq);
        return acc;
      }, {} as Record<string, typeof allEquipment>);
      
      // Get one from each main category
      const mainCategories = ['driver', 'iron', 'putter', 'wedge', 'fairway_wood', 'hybrid'];
      const accessoryCategories = ['ball', 'glove', 'rangefinder', 'gps', 'bag', 'tee'];
      
      const selectedEquipment: typeof allEquipment = [];
      
      // Get top item from each main category
      mainCategories.forEach(category => {
        const items = equipmentByCategory[category];
        if (items && Array.isArray(items) && items.length > 0) {
          const withPhotos = items.filter(eq => eq && (eq.primaryPhoto || eq.image_url));
          if (withPhotos.length > 0) {
            selectedEquipment.push(withPhotos[0]);
          }
        }
      });
      
      // Get top accessories
      accessoryCategories.forEach(category => {
        const items = equipmentByCategory[category];
        if (items && Array.isArray(items) && items.length > 0 && selectedEquipment.length < 12) {
          const withPhotos = items.filter(eq => eq && (eq.primaryPhoto || eq.image_url));
          if (withPhotos.length > 0) {
            selectedEquipment.push(withPhotos[0]);
          }
        }
      });
      
      console.log('Selected equipment:', selectedEquipment.length, 'items from various categories');
      setEquipment(selectedEquipment.slice(0, 12));
    } catch (error) {
      console.error('Error loading equipment:', error);
      setEquipment([]);
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
      setTopBags([]);
      // Don't throw, just log the error
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading stats...');
      // Get real stats from database with correct table names
      // Use Promise.allSettled to handle individual failures
      const results = await Promise.allSettled([
        supabase.from('user_bags').select('*', { count: 'exact', head: true }),
        supabase.from('equipment').select('*', { count: 'exact', head: true }),
        supabase.from('equipment_photos').select('*', { count: 'exact', head: true }),
        supabase.from('feed_posts').select('*', { count: 'exact', head: true })
      ]);

      const stats = {
        totalBags: results[0].status === 'fulfilled' ? (results[0].value.count || 0) : 0,
        totalEquipment: results[1].status === 'fulfilled' ? (results[1].value.count || 0) : 0,
        totalPhotos: results[2].status === 'fulfilled' ? (results[2].value.count || 0) : 0,
        totalPosts: results[3].status === 'fulfilled' ? (results[3].value.count || 0) : 0
      };
      
      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Failed to load stat ${index}:`, result.reason);
        }
      });
      
      console.log('Stats loaded:', stats);
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats on complete failure
      setStats({
        totalBags: 0,
        totalEquipment: 0,
        totalPhotos: 0,
        totalPosts: 0
      });
    }
  };
  


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

  // Stats data - Real data from database
  const statsData = [
    { value: `${stats.totalBags}`, label: "Bags Shared" },
    { value: `${stats.totalEquipment}+`, label: "Clubs in Database" },
    { value: `${stats.totalPhotos}`, label: "Community Photos" },
    { value: `${stats.totalPosts}`, label: "Gear Discussions" }
  ];

  return (
    <div className="min-h-screen bg-black font-body">
      <Navigation />
      
      {/* Dynamic Hero Section with Equipment Carousel */}
      <section className="h-[45vh] relative overflow-hidden bg-black">
        {/* Revolving Equipment Carousel Background */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            </div>
          ) : heroImages.length > 0 ? (
            <div className="relative w-full h-full overflow-hidden">
              {/* Gradient overlays for fade effect on edges */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none" />
              
              {/* Static equipment showcase - performance optimized */}
              <div className="h-full flex items-center justify-center overflow-hidden">
                <div className="flex gap-8 px-12">
                  {heroImages.slice(0, 5).map((item, index) => (
                    <div
                      key={`hero-${index}`}
                      className="h-[35vh] w-[300px] flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                    >
                      {item.url ? (
                        <img 
                          src={item.url}
                          className="max-w-full max-h-full object-contain drop-shadow-2xl"
                          alt={`${item.brand || 'Equipment'} ${item.model || ''}`}
                          loading={index > 2 ? "lazy" : "eager"}
                          onError={(e) => {
                            console.warn(`Failed to load hero image ${index}:`, item.url);
                            const target = e.currentTarget as HTMLImageElement;
                            // Hide the broken image
                            target.style.display = 'none';
                            // Remove from DOM to prevent memory leak
                            target.remove();
                          }}
                          onLoad={(e) => {
                            // Ensure image is visible once loaded
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.opacity = '1';
                          }}
                          style={{ opacity: 0, transition: 'opacity 0.3s' }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0d3b0d] via-[#0a0a0a] to-black" />
          )}
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 pointer-events-none" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center px-4">
          <div className="text-center max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
              Your Bag, Your Story
            </h1>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto font-body">
              Share your golf setup. Connect with fellow golfers. Build the ultimate gear community.
            </p>

            {/* Updated CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleBuildBagClick}
                className="bg-[#10B981] hover:bg-[#0ea674] px-8 py-4 text-lg font-bold hover:scale-105 transition-transform"
              >
                Build Your Bag
              </Button>
              <Button 
                onClick={handleExploreBagsClick}
                variant="outline"
                className="px-8 py-4 bg-[#1a1a1a] text-white font-medium border border-white/20 hover:bg-[#2a2a2a] transition-colors"
              >
                Explore Bags
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Top Bags Section - Using Real BagCard Components */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Top Bags
            </h2>
            <p className="text-gray-400 text-lg font-body">
              Most teed bags from our community
            </p>
          </div>

          {/* Top 3 Bags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <>
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
                <div className="h-96 bg-[#1a1a1a] rounded-lg animate-pulse" />
              </>
            ) : topBags && topBags.length > 0 ? (
              topBags.map((bag, index) => bag && bag.id ? (
                <ErrorBoundary key={bag.id}>
                  <BagCard 
                    bag={bag} 
                    onView={(bagId) => navigate(`/bags/${bagId}`)}
                  />
                </ErrorBoundary>
              ) : null)
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-400">No bags available yet. Be the first to create one!</p>
              </div>
            )}
          </div>

          {/* Popular Equipment Section */}
          <div className="mt-20">
            <h3 className="text-2xl font-display font-bold text-white mb-6">Popular Equipment</h3>
            
            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {equipment && Array.isArray(equipment) && equipment.map((item) => item && item.id ? (
                <EquipmentCard 
                  key={item.id}
                  equipment={item} 
                  onViewDetails={() => navigate(`/equipment/${item.id}`)}
                />
              ) : null)}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Real Data */}
      <section className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {statsData.map((stat, i) => (
              <div 
                key={i}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="text-3xl font-display font-bold text-[#10B981] mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm font-body">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features Section */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-white mb-4">Join the Community</h2>
            <p className="text-gray-400">Connect with golfers who share your passion for the game and gear</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-display font-bold mb-2">Share Your Setup</h3>
              <p className="text-gray-400 text-sm">Showcase your clubs with photos and detailed specs</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-display font-bold mb-2">Discuss Equipment</h3>
              <p className="text-gray-400 text-sm">Join forums to talk about gear, tips, and experiences</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className="text-white font-display font-bold mb-2">Follow Other Golfers</h3>
              <p className="text-gray-400 text-sm">See what's in the bags of players you admire</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-black via-[#0a1a0a] to-black">
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-display font-bold text-white mb-6">
            Ready to Tee Off?
          </h2>
          <p className="text-xl text-gray-400 mb-12 font-body">
            Join thousands of golfers sharing their passion for the game
          </p>

          <Button 
            onClick={handleBuildBagClick}
            className="bg-[#10B981] hover:bg-[#0ea674] px-12 py-5 text-xl hover:scale-105 transition-transform shadow-lg shadow-[#10B981]/20"
          >
            Build Your Bag
          </Button>
        </div>
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