import { motion, useScroll, useTransform } from "framer-motion";
import Navigation from "@/components/Navigation";
import FloatingActionButton from "@/components/FloatingActionButton";
import { getBags } from "@/services/bags";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Share2, DollarSign, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getEquipment } from "@/services/equipment";
import type { Database } from "@/lib/supabase";

type Equipment = Database['public']['Tables']['equipment']['Row'];

const Index = () => {
  // Hero carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingBags, setTrendingBags] = useState<any[]>([]);
  
  // Hero equipment images for carousel - using database equipment images
  const heroImages = equipment.slice(0, 4).map(eq => eq.image_url).filter(Boolean) as string[];

  // Load equipment data
  useEffect(() => {
    loadEquipment();
    loadTrendingBags();
  }, []);
  
  const loadEquipment = async () => {
    try {
      const data = await getEquipment({ limit: 20 });
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTrendingBags = async () => {
    try {
      const data = await getBags({ sortBy: 'most-liked', limit: 8 });
      const transformedBags = (data || []).map(bag => ({
        id: bag.id,
        title: bag.name,
        owner: bag.profile?.full_name || bag.profile?.username || 'Unknown',
        image: bag.background_image ? `/images/${bag.background_image}.jpg` : '/placeholder.svg',
        clubCount: bag.bag_equipment?.length || 0,
        handicap: '5.2',
        totalValue: bag.bag_equipment?.reduce((sum: number, item: any) => 
          sum + (item.purchase_price || item.equipment?.msrp || 0), 0) || 0
      }));
      setTrendingBags(transformedBags);
    } catch (error) {
      console.error('Error loading trending bags:', error);
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

  // Equipment categories for dream bag builder
  const equipmentCategories = [
    { category: "Driver", slots: "1 slot", icon: "🏌️", gradient: "from-blue-600/20 to-blue-400/10" },
    { category: "Fairway Woods", slots: "2-5 slots", icon: "🌲", gradient: "from-green-600/20 to-green-400/10" },
    { category: "Irons", slots: "7-9 slots", icon: "⚡", gradient: "from-yellow-600/20 to-yellow-400/10" },
    { category: "Wedges", slots: "2-4 slots", icon: "🎯", gradient: "from-red-600/20 to-red-400/10" },
    { category: "Putter", slots: "1 slot", icon: "🏁", gradient: "from-purple-600/20 to-purple-400/10" },
    { category: "Golf Ball", slots: "1 type", icon: "⚪", gradient: "from-gray-600/20 to-gray-400/10" },
    { category: "Golf Bag", slots: "1 bag", icon: "🎒", gradient: "from-orange-600/20 to-orange-400/10" },
    { category: "Accessories", slots: "Multiple", icon: "✨", gradient: "from-pink-600/20 to-pink-400/10" }
  ];

  // Dynamic grid heights for masonry effect
  const getDynamicHeight = (index: number) => {
    const heights = ['h-64', 'h-80', 'h-72', 'h-96', 'h-60', 'h-84'];
    return heights[index % heights.length];
  };

  // Popular equipment data - using real equipment data
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'driver': '🏌️',
      'irons': '⚡',
      'putter': '🏁',
      'wedges': '🎯',
      'fairway_wood': '🌲',
      'golf_ball': '⚪'
    };
    return iconMap[category] || '🏌️';
  };

  const popularEquipment = equipment.map(eq => ({
    brand: eq.brand,
    model: eq.model,
    category: eq.category.charAt(0).toUpperCase() + eq.category.slice(1),
    price: `$${Number(eq.msrp || 0).toFixed(0)}`,
    image: eq.image_url || '/api/placeholder/200/200',
    icon: getCategoryIcon(eq.category)
  }));

  // Stats data - Community focused
  const stats = [
    { value: "25K+", label: "Bags Shared" },
    { value: "500+", label: "Clubs in Database" },
    { value: "2M+", label: "Club Combos" },
    { value: "Daily", label: "Gear Discussions" }
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
          ) : heroImages.map((image, index) => (
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
          ))}
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
              Show off your setup. Share your specs. Earn from your recommendations.
            </motion.p>

            {/* Updated CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Button
                variant="luxury"
                size="lg"
                className="px-8 py-4 text-lg font-bold hover:scale-105 transition-transform"
              >
                Build Your Bag
              </Button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-[10px] text-white font-medium rounded-lg border border-white/30 hover:bg-white/20 transition-colors">
                Explore Bags
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Trending Bags - Interactive Gallery */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Trending Bags
            </h2>
            <p className="text-gray-400 text-lg">
              See what's in the bags of top players
            </p>
          </motion.div>

          {/* Interactive Masonry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
            {trendingBags.map((bag, index) => (
              <motion.div 
                key={bag.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`group relative overflow-hidden rounded-lg cursor-pointer transition-[transform,shadow] duration-300 hover:scale-105 hover:shadow-2xl ${getDynamicHeight(index)}`}
              >
                {/* Equipment Collage Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black">
                  <img 
                    src={bag.image}
                    alt={bag.title}
                    className="w-full h-full object-cover opacity-80"
                    loading="lazy"
                  />
                </div>

                {/* Equipment Count Overlay */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                  {bag.clubCount} clubs
                </div>
                
                {/* Owner Info Always Visible */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg">{bag.owner}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>{bag.handicap} HCP</span>
                    <span className="text-primary font-bold">${bag.totalValue.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Hover Overlay with View Bag button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-16 left-4 right-4">
                    <button className="w-full px-3 py-2 bg-primary/20 backdrop-blur-sm text-white text-sm rounded-lg border border-primary/40 hover:bg-primary/30 transition-colors">
                      View Bag
                    </button>
                  </div>
                </div>

                {/* FULL Badge */}
                {bag.clubCount > 12 && (
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    FULL
                  </div>
                )}
              </motion.div>
            ))}
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
                {popularEquipment.map((equipment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex-shrink-0 w-64 bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-colors cursor-pointer group"
                  >
                    {/* Equipment Image */}
                    <div className="aspect-square bg-white/5 rounded-lg mb-3 overflow-hidden">
                      <img 
                        src={equipment.image}
                        alt={`${equipment.brand} ${equipment.model}`}
                        className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Equipment Info */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium text-sm">{equipment.brand}</h4>
                      <span className="text-2xl">{equipment.icon}</span>
                    </div>
                    <p className="text-gray-300 text-xs mb-2">{equipment.model}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">{equipment.category}</span>
                      <span className="text-primary font-bold text-sm">{equipment.price}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Build Your Dream Bag - Enhanced Visual Builder */}
      <section className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Build Your Dream Bag
            </h2>
            <p className="text-gray-400 text-lg">
              Start with your current setup or explore what the pros are playing
            </p>
          </motion.div>

          {/* Enhanced Equipment Builder */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Course Background Preview */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-blue-950/90 via-black/80 to-teal-950/90" />
            </div>

            {/* Enhanced Equipment Categories Grid */}
            <div className="relative z-10 p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {equipmentCategories.map((category, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-gradient-to-br ${category.gradient} backdrop-blur-[10px] border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-colors cursor-pointer group`}
                  >
                    {/* Larger, more prominent icon */}
                    <div className="aspect-square bg-white/5 rounded-lg mb-3 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    {/* Club category name */}
                    <h4 className="text-white font-bold text-sm mb-1">{category.category}</h4>
                    {/* Slot indicator */}
                    <p className="text-gray-300 text-xs font-medium">{category.slots}</p>
                  </motion.div>
                ))}
              </div>

              {/* Full Width Add Equipment Button with Dashed Border */}
              <div className="mt-8">
                <button className="w-full px-6 py-4 bg-transparent text-white rounded-xl border-2 border-dashed border-white/30 hover:border-solid hover:border-primary/50 hover:bg-primary/10 transition-[colors,border] flex items-center justify-center gap-3 group">
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Add Your Equipment</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-gray-950 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-[10px] border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors"
              >
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-950 to-black">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400">Simple steps to showcase your golf setup</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-white font-bold mb-2">1. Build Your Virtual Bag</h3>
              <p className="text-gray-400 text-sm">Add your clubs, specs, and photos to create your digital golf bag</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-white font-bold mb-2">2. Share Your Equipment Setup</h3>
              <p className="text-gray-400 text-sm">Connect with other golfers and showcase your unique setup</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-white font-bold mb-2">3. Earn Commissions on Purchases</h3>
              <p className="text-gray-400 text-sm">Get rewarded when others purchase equipment you recommend</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 gap-4 h-full">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="bg-primary/20 rounded-lg" />
            ))}
          </div>
        </div>

        <motion.div 
          className="relative z-10 max-w-4xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-display font-bold text-white mb-6">
            Your Bag Awaits
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join the revolution in golf equipment culture
          </p>

          {/* Glowing CTA */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <Button 
              variant="luxury" 
              size="lg" 
              className="relative px-12 py-5 text-xl hover:scale-105 transition-transform"
            >
              Start Building
            </Button>
          </div>
        </motion.div>
      </section>
      
      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
};

export default Index;