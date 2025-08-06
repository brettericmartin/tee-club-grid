import { User, Grid, Heart, Users, LogOut, MessageSquare, Camera } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { ProfileDialog } from "@/components/profile/ProfileDialog";
import { getProfile } from "@/services/profileService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TeedLogo from "@/components/shared/TeedLogo";

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
      className={`relative font-medium transition-colors px-3 py-2 rounded-lg ${
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
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch profile data when user changes
  useEffect(() => {
    if (user) {
      console.log('[Navigation] Fetching profile for user:', user.id);
      getProfile(user.id).then(profile => {
        if (profile) {
          console.log('[Navigation] Profile loaded:', {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          });
          setProfileData(profile);
        }
      }).catch(error => {
        console.error('Error fetching profile:', error);
      });
    } else {
      setProfileData(null);
    }
  }, [user, showProfile]); // Also refetch when profile dialog closes

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
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
            
            {/* Left Side - Logo & Main Nav */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
                <TeedLogo size="md" className="transition-transform" />
                <span className="font-bold text-xl text-white hidden sm:block">Teed.club</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <NavLink to="/bags-browser">Bags</NavLink>
                <NavLink to="/equipment">Equipment</NavLink>
              </div>
            </div>

            {/* Center - Feed & My Bag Buttons */}
            <div className="flex flex-1 justify-center items-center gap-2 sm:gap-4">
              <Link 
                to="/feed"
                className="group"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className={`absolute inset-0 blur-xl transition-opacity ${
                    location.pathname === '/feed' ? 'bg-primary/40' : 'bg-primary/20 group-hover:bg-primary/30'
                  }`} />
                  
                  {/* Feed Button */}
                  <div className={`relative text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium flex items-center gap-1 sm:gap-1.5 hover:scale-105 transition-transform duration-200 ${
                    location.pathname === '/feed' 
                      ? 'bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}>
                    <img src="/dog.png" alt="Feed" className="w-6 h-6" />
                    <span className="text-sm sm:text-base">Feed</span>
                  </div>
                </div>
              </Link>

              <Link 
                to="/my-bag"
                className="group"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className={`absolute inset-0 blur-xl transition-opacity ${
                    location.pathname === '/my-bag' ? 'bg-primary/40' : 'bg-primary/20 group-hover:bg-primary/30'
                  }`} />
                  
                  {/* Button with location pin icon */}
                  <div className={`relative text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium flex items-center gap-1 sm:gap-1.5 hover:scale-105 transition-transform duration-200 ${
                    location.pathname === '/my-bag' 
                      ? 'bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}>
                    <img src="/MYBAG.png" alt="My Bag" className="w-6 h-6" />
                    <span className="text-sm sm:text-base">My Bag</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Right Side - Forum + Profile */}
            <div className="flex items-center gap-4">
              <Link
                to="/forum"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Forum</span>
              </Link>
              
              <div className="flex items-center">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative">
                        <Avatar className="w-10 h-10 hover:scale-110 transition-transform cursor-pointer">
                          <AvatarImage 
                            src={profileData?.avatar_url || user.user_metadata?.avatar_url}
                            alt="Profile"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                            {profileData?.username?.[0]?.toUpperCase() || user.user_metadata?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {/* Notification Badge */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{profileData?.display_name || profileData?.username || user.user_metadata?.username || 'My Account'}</span>
                          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowProfile(true)}>
                        <User className="mr-2 h-4 w-4" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/ai-analyzer">
                          <Camera className="mr-2 h-4 w-4" />
                          AI Bag Analyzer
                        </Link>
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
                    className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:scale-110 transition-[colors,transform] flex items-center justify-center"
                  >
                    <User className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </nav>

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
      
      {/* Profile Dialog */}
      <ProfileDialog
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
};

export default Navigation;