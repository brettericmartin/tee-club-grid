import { Search, User, Home, Grid, Heart, Settings, Users, MapPin, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

const NavLink = ({ to, children }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to}
      className={`font-medium transition-colors ${
        isActive ? 'text-white' : 'text-white/70 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
};

const Navigation = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50">
        {/* Gel/Glass Navigation Bar */}
        <div className="gel-card bg-black/20 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            
            {/* Left Side - Logo & Main Nav */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
                <div className="w-8 h-8 bg-primary rounded-full" />
                <span className="font-bold text-xl text-white">Teed.club</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <NavLink to="/bags">Bags</NavLink>
                <NavLink to="/equipment">Equipment</NavLink>
              </div>
            </div>

            {/* Center - Feed & My Bag Buttons */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <Link 
                to="/feed"
                className="group"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all" />
                  
                  {/* Feed Button */}
                  <div className="relative bg-gradient-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-all">
                    <Home className="w-4 h-4" />
                    <span>Feed</span>
                  </div>
                </div>
              </Link>

              <Link 
                to="/my-bag"
                className="group"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all" />
                  
                  {/* Button with location pin icon */}
                  <div className="relative bg-gradient-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-all">
                    <MapPin className="w-4 h-4" />
                    <span>My Bag</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Right Side - Saved/Following + Search & Profile */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6">
                <NavLink to="/saved">Saved</NavLink>
                <NavLink to="/following">Following</NavLink>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 transition-all"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
                <button className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:scale-110 transition-all flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                  {/* Notification Badge */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden bg-black/20 backdrop-blur-xl border-t border-white/20">
          <div className="flex justify-around py-2">
            <Link to="/bags" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Home size={16} />
              <span className="text-xs">Bags</span>
            </Link>
            <Link to="/equipment" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Grid size={16} />
              <span className="text-xs">Equipment</span>
            </Link>
            <Link to="/saved" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Heart size={16} />
              <span className="text-xs">Saved</span>
            </Link>
            <Link to="/following" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Users size={16} />
              <span className="text-xs">Following</span>
            </Link>
            <Link to="/feed" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Home size={16} />
              <span className="text-xs">Feed</span>
            </Link>
            <Link to="/my-bag" className="p-2 text-white/70 hover:text-white flex flex-col items-center gap-1">
              <Settings size={16} />
              <span className="text-xs">My Bag</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-medium">Search Equipment & Bags</h3>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search for equipment, bags, players..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
            <div className="mt-4 text-gray-400 text-sm">
              Try: "TaylorMade Stealth", "Marcus Johnson", "Wedge Setup"
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;