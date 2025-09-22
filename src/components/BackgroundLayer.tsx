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
    gradient: 'from-gray-900 via-gray-800 to-gray-900',
    overlayOpacity: 'bg-black/20'
  },
  {
    id: 'white',
    name: 'Pure White',
    description: 'Minimalist white background',
    gradient: 'from-gray-100 via-white to-gray-50',
    overlayOpacity: 'bg-white/10'
  },
  {
    id: 'usa',
    name: 'USA',
    description: 'Red, white, and blue American theme',
    gradient: 'from-blue-900 via-white to-red-900',
    overlayOpacity: 'bg-black/30'
  },
  {
    id: 'eu',
    name: 'EU',
    description: 'European Union blue and gold',
    gradient: 'from-blue-800 via-blue-700 to-yellow-600',
    overlayOpacity: 'bg-black/25'
  },
  {
    id: 'pnw',
    name: 'Pacific Northwest',
    description: 'Deep forest green for PNW golf',
    gradient: 'from-green-950 via-green-900 to-green-800',
    overlayOpacity: 'bg-black/30'
  },
  {
    id: 'desert',
    name: 'Desert',
    description: 'Sandy tones for desert golf',
    gradient: 'from-amber-200 via-orange-300 to-amber-400',
    overlayOpacity: 'bg-black/25'
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
      
      {/* Subtle pattern overlay for texture - skip for white background */}
      {background.id !== 'white' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
      )}
    </div>
  );
};

export default BackgroundLayer;