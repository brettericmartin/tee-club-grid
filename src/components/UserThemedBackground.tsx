import { useMemo } from "react";

interface UserThemedBackgroundProps {
  primaryColor?: string;
  accentColor?: string;
  useCustomColors?: boolean;
  className?: string;
}

const UserThemedBackground = ({ 
  primaryColor = '#10B981', 
  accentColor = '#FFD700',
  useCustomColors = false,
  className = "" 
}: UserThemedBackgroundProps) => {
  
  // Convert hex to RGB for opacity support
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '16, 185, 129'; // Default emerald
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  };

  const primaryRgb = useMemo(() => hexToRgb(primaryColor), [primaryColor]);
  const accentRgb = useMemo(() => hexToRgb(accentColor), [accentColor]);

  if (!useCustomColors) {
    return null; // Let the default BackgroundLayer handle it
  }

  return (
    <div className={`fixed inset-0 z-0 ${className}`}>
      {/* Main gradient using primary color - MUCH SUBTLER */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            rgba(${primaryRgb}, 0.04) 0%, 
            rgba(${primaryRgb}, 0.02) 25%,
            rgba(${accentRgb}, 0.02) 75%,
            rgba(${accentRgb}, 0.01) 100%)`
        }}
      />
      
      {/* Dark overlay for contrast - MORE OPAQUE */}
      <div className="absolute inset-0 bg-[#0a0a0a]/95" />
      
      {/* Radial gradient accent - SUBTLER */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, 
            rgba(${primaryRgb}, 0.06) 0%, 
            transparent 40%),
            radial-gradient(circle at 70% 70%, 
            rgba(${accentRgb}, 0.04) 0%, 
            transparent 40%)`
        }}
      />
    </div>
  );
};

export default UserThemedBackground;