import { Link, useLocation } from "react-router-dom";
import { Grid, Heart, Users, Package, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      to: "/feed",
      icon: "custom",
      customIcon: "/dog.png",
      label: "Feed",
    },
    {
      to: "/bags-browser",
      icon: Grid,
      label: "Bags",
    },
    {
      to: "/equipment",
      icon: Package,
      label: "Equipment",
    },
    {
      to: "/forum",
      icon: MessageSquare,
      label: "Forum",
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
                {item.icon === "custom" ? (
                  <img 
                    src={item.customIcon} 
                    alt={item.label} 
                    className={cn(
                      "w-6 h-6",
                      isActive && "scale-110"
                    )}
                  />
                ) : (
                  <Icon size={20} className={cn(
                    isActive && "scale-110"
                  )} />
                )}
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