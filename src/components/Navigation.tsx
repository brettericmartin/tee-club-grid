import { Search, User, Home, Grid, Heart, Settings, Users, MapPin, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { SignUpModal } from "@/components/auth/SignUpModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      className={`relative font-medium transition-all px-3 py-2 rounded-lg ${
        isActive 
          ? 'text-white bg-white/10' 
          : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
};

const Navigation = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50">
        {/* Glass Navigation Bar */}
        <div className="bg-white/10 backdrop-blur-[10px] border-b border-white/20">
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
                  <div className={`absolute inset-0 blur-xl transition-all ${
                    location.pathname === '/feed' ? 'bg-primary/40' : 'bg-primary/20 group-hover:bg-primary/30'
                  }`} />
                  
                  {/* Feed Button */}
                  <div className={`relative text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-all duration-200 ${
                    location.pathname === '/feed' 
                      ? 'bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}>
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
                  <div className={`absolute inset-0 blur-xl transition-all ${
                    location.pathname === '/my-bag' ? 'bg-primary/40' : 'bg-primary/20 group-hover:bg-primary/30'
                  }`} />
                  
                  {/* Button with location pin icon */}
                  <div className={`relative text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-all duration-200 ${
                    location.pathname === '/my-bag' 
                      ? 'bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}>
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
                
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative">
                        <Avatar className="w-10 h-10 hover:scale-110 transition-all cursor-pointer">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800">
                            {user.user_metadata?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Notification Badge */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user.user_metadata?.username || 'My Account'}</span>
                          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button 
                    onClick={() => setShowSignIn(true)}
                    className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:scale-110 transition-all flex items-center justify-center"
                  >
                    <User className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden bg-white/10 backdrop-blur-[10px] border-t border-white/20">
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
          <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-medium">Search Equipment & Bags</h3>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input 
                type="text" 
                placeholder="Search for equipment, bags, players..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:border-primary focus:outline-none placeholder-white/50"
                autoFocus
              />
            </div>
            <div className="mt-4 text-white/50 text-sm">
              Try: "TaylorMade Stealth", "Marcus Johnson", "Wedge Setup"
            </div>
          </div>
        </div>
      )}

      {/* Auth Modals */}
      <SignInModal 
        isOpen={showSignIn} 
        onClose={() => setShowSignIn(false)}
        onSignUpClick={() => setShowSignUp(true)}
      />
      <SignUpModal 
        isOpen={showSignUp} 
        onClose={() => setShowSignUp(false)}
        onSignInClick={() => setShowSignIn(true)}
      />
    </>
  );
};

export default Navigation;