import { useMemo } from "react";

export interface BagBackground {
  id: 'midwest-lush' | 'desert' | 'ocean' | 'mountain';
  name: string;
  description: string;
  gradient: string;
  overlayOpacity: string;
}

export const bagBackgrounds: BagBackground[] = [
  {
    id: 'midwest-lush',
    name: 'Country Club Classic',
    description: 'Rolling hills and pristine fairways',
    gradient: 'from-emerald-950 via-green-900 to-emerald-800',
    overlayOpacity: 'bg-black/40'
  },
  {
    id: 'desert',
    name: 'Desert Oasis',
    description: 'Sun-baked terrain and dramatic landscapes',
    gradient: 'from-orange-950 via-amber-900 to-yellow-800',
    overlayOpacity: 'bg-black/30'
  },
  {
    id: 'ocean',
    name: 'Coastal Paradise',
    description: 'Ocean breeze and seaside views',
    gradient: 'from-blue-950 via-cyan-900 to-teal-800',
    overlayOpacity: 'bg-black/35'
  },
  {
    id: 'mountain',
    name: 'Mountain Majesty',
    description: 'Alpine peaks and crisp air',
    gradient: 'from-slate-950 via-gray-900 to-stone-800',
    overlayOpacity: 'bg-black/45'
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
      
      {/* Additional texture/pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
    </div>
  );
};

export default BackgroundLayer;