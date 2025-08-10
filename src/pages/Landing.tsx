import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import FloatingActionButton from "@/components/FloatingActionButton";
import { SignInModal } from "@/components/auth/SignInModal";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { Hero } from "@/components/landing/Hero";
import { BagShowcaseLarge } from "@/components/landing/BagShowcaseLarge";
import { GearGrid } from "@/components/landing/GearGrid";
import { StickyCta } from "@/components/landing/StickyCta";
import { motion } from "framer-motion";
import { Users, Trophy, Camera, MessageCircle, Star, TrendingUp } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const handleBuildBagClick = () => {
    if (user) {
      navigate('/my-bag');
    } else {
      setShowSignIn(true);
    }
  };

  const handleExploreBagsClick = () => {
    navigate('/bags-browser');
  };

  const handleViewFullBag = () => {
    navigate('/bags-browser');
  };

  const handleViewEquipmentDetails = (id: string) => {
    navigate(`/equipment/${id}`);
  };

  const handleBrowseAllEquipment = () => {
    navigate('/equipment');
  };

  // Stats data - honest startup metrics
  const statsData = [
    { value: "Day 1", label: "Of Something Big", icon: Trophy },
    { value: "1,000+", label: "Equipment Database", icon: Camera },
    { value: "100%", label: "Free to Join", icon: Star },
    { value: "You", label: "Could Be Next", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      {/* Hero Section */}
      <Hero 
        onBuildBag={handleBuildBagClick}
        onExploreBags={handleExploreBagsClick}
      />
      
      {/* Interactive Bag Showcase - Brett's Actual Desert Summer Bag (2x size) */}
      <BagShowcaseLarge />
      
      {/* Gear Discovery Grid */}
      <GearGrid 
        onViewDetails={handleViewEquipmentDetails}
        onBrowseAll={handleBrowseAllEquipment}
      />
      
      {/* Social Proof Stats Section */}
      <section className="py-24 bg-gradient-to-b from-[#0a0a0a] to-black">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Help Us Build Something Special
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              We're just getting started. Be part of the founding community that shapes the future of golf gear sharing.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statsData.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition-colors">
                  <stat.icon className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Community Features Section */}
      <section className="py-24 bg-black">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What We're Building Together
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              A place where every golfer can share their setup, discover new gear, and connect with others who love the game
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center group"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Share Your Setup</h3>
              <p className="text-white/60">
                Upload photos, add specs, and showcase your complete golf bag to the community
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center group"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Discuss & Review</h3>
              <p className="text-white/60">
                Join equipment forums, share reviews, and get advice from experienced players
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center group"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Follow & Connect</h3>
              <p className="text-white/60">
                Follow pro setups, get inspired by others, and build your golf network
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img 
            src="/hero-clubs-bg.png"
            alt="Golf clubs"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto px-4 text-center"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Be a Founding Member
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            This is day one. Help us build the community golfers have been waiting for. Your input shapes what we become.
          </p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <button
              onClick={handleBuildBagClick}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-6 rounded-full text-xl font-bold shadow-2xl shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
            >
              Join as a Founder
            </button>
          </motion.div>
          
          <p className="mt-6 text-sm text-white/50">
            100% free • Early members get special founder badge
          </p>
        </motion.div>
      </section>
      
      {/* Sticky CTA */}
      <StickyCta 
        onBuildBag={handleBuildBagClick}
        onExploreBags={handleExploreBagsClick}
      />
      
      {/* Floating Action Button */}
      <FloatingActionButton />
      
      {/* Auth Modals */}
      <SignInModal 
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSignUpClick={() => {
          setShowSignIn(false);
          setShowSignUp(true);
        }}
      />
      
      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSignInClick={() => {
          setShowSignUp(false);
          setShowSignIn(true);
        }}
      />
    </div>
  );
};

export default Landing;