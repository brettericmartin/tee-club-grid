import { useMemo } from "react";

export interface BagBackground {
  id: 'charcoal' | 'white' | 'usa' | 'eu' | 'pnw' | 'desert';
  name: string;
  description: string;
  gradient: string;
  overlayOpacity: string;
}

export const bagBackgrounds: BagBackground[] = [
  {
    id: 'charcoal',
    name: 'Charcoal',
    description: 'Clean and professional dark gray',
    gradient: 'from-[#2a2a2a] via-[#1a1a1a] to-[#2a2a2a]',
    overlayOpacity: 'bg-black/10'
  },
  {
    id: 'white',
    name: 'Pure White',
    description: 'Minimalist white background',
    gradient: 'from-gray-50 via-white to-gray-100',
    overlayOpacity: 'bg-black/5'
  },
  {
    id: 'usa',
    name: 'USA',
    description: 'Red, white, and blue American theme',
    gradient: 'from-blue-800 via-gray-100 to-red-800',
    overlayOpacity: 'bg-[#1a1a1a]/40'
  },
  {
    id: 'eu',
    name: 'EU',
    description: 'European Union blue and gold',
    gradient: 'from-blue-700 via-blue-600 to-yellow-500',
    overlayOpacity: 'bg-[#1a1a1a]/35'
  },
  {
    id: 'pnw',
    name: 'Pacific Northwest',
    description: 'Deep forest green for PNW golf',
    gradient: 'from-green-900 via-emerald-800 to-green-900',
    overlayOpacity: 'bg-[#1a1a1a]/40'
  },
  {
    id: 'desert',
    name: 'Desert',
    description: 'Sandy desert with cactus greens',
    gradient: 'from-amber-700 via-yellow-600 to-green-700',
    overlayOpacity: 'bg-[#1a1a1a]/35'
  }
];

interface BackgroundLayerProps {
  backgroundId: BagBackground['id'];
  className?: string;
}

const BackgroundLayer = ({ backgroundId, className = "" }: BackgroundLayerProps) => {
  const background = useMemo(
    () => bagBackgrounds.find(bg => bg.id === backgroundId) || bagBackgrounds[0],
    [backgroundId]
  );

  return (
    <div className={`fixed inset-0 z-0 ${className}`}>
      {/* Main gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${background.gradient}`} />
      
      {/* Overlay for content readability */}
      <div className={`absolute inset-0 ${background.overlayOpacity}`} />
      
      {/* Subtle texture overlay - different for white vs dark backgrounds */}
      {background.id === 'white' ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)]" />
      )}
      
      {/* Additional noise texture for depth */}
      <div 
        className="absolute inset-0 opacity-[0.015]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default BackgroundLayer;