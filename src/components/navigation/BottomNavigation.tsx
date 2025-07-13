import { Link, useLocation } from "react-router-dom";
import { Home, Grid, MapPin, Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      to: "/feed",
      icon: Home,
      label: "Feed",
    },
    {
      to: "/bags",
      icon: Grid,
      label: "Bags",
    },
    {
      to: "/my-bag",
      icon: MapPin,
      label: "My Bag",
    },
    {
      to: "/saved",
      icon: Heart,
      label: "Saved",
    },
    {
      to: "/following",
      icon: Users,
      label: "Following",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-black/90 backdrop-blur-[10px] border-t border-white/20">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 flex-1",
                  "transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-white/70 hover:text-white"
                )}
              >
                <Icon size={20} className={cn(
                  isActive && "scale-110"
                )} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;