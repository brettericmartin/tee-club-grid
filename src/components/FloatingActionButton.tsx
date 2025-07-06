import { Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

const FloatingActionButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 group">
      {/* Tooltip */}
      <div className="absolute bottom-16 right-0 bg-black text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Quick Add to Bag
      </div>
      
      {/* FAB Button */}
      <button className="w-14 h-14 bg-primary hover:bg-primary-hover rounded-full shadow-luxury hover:shadow-hover transition-all duration-300 flex items-center justify-center hover:scale-110">
        <div className="relative">
          <ShoppingBag className="w-6 h-6 text-primary-foreground" />
          <Plus className="w-3 h-3 text-primary-foreground absolute -top-1 -right-1" />
        </div>
      </button>
    </div>
  );
};

export default FloatingActionButton;