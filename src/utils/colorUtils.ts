/**
 * Color utility functions for dynamic theming
 */

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '16, 185, 129'; // Default to emerald
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex).split(', ').map(Number);
  const factor = 1 - percent / 100;
  const [r, g, b] = rgb.map(val => Math.round(val * factor));
  return rgbToHex(r, g, b);
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex).split(', ').map(Number);
  const [r, g, b] = rgb.map(val => {
    const diff = 255 - val;
    return Math.round(val + diff * (percent / 100));
  });
  return rgbToHex(r, g, b);
}

/**
 * Mix two colors together
 */
export function mixColors(hex1: string, hex2: string, ratio: number = 0.5): string {
  const rgb1 = hexToRgb(hex1).split(', ').map(Number);
  const rgb2 = hexToRgb(hex2).split(', ').map(Number);
  
  const [r, g, b] = rgb1.map((val, i) => 
    Math.round(val * (1 - ratio) + rgb2[i] * ratio)
  );
  
  return rgbToHex(r, g, b);
}

/**
 * Generate a color palette based on primary and accent colors
 */
export function generateColorPalette(primaryHex: string, accentHex: string) {
  const primaryRgb = hexToRgb(primaryHex);
  const accentRgb = hexToRgb(accentHex);
  
  // Generate MUCH SUBTLER background shades by mixing with very dark gray
  const bgBase = mixColors('#111111', primaryHex, 0.97); // Only 3% primary tint on dark background
  const bgCard = mixColors('#1a1a1a', primaryHex, 0.95); // 5% primary on slightly lighter background
  const bgElevated = mixColors('#242424', primaryHex, 0.93); // 7% primary
  const bgHover = mixColors('#2a2a2a', primaryHex, 0.90); // 10% primary
  
  return {
    // Raw colors
    primary: primaryHex,
    primaryRgb,
    accent: accentHex,
    accentRgb,
    
    // Background hierarchy - subtle tints on dark backgrounds
    bgBase,
    bgCard,
    bgElevated,
    bgHover,
    
    // Navigation with very subtle primary tint
    navBg: `rgba(${primaryRgb}, 0.05)`, // Reduced from 0.08
    navBorder: `rgba(${primaryRgb}, 0.1)`, // Reduced from 0.15
    
    // Borders with PROMINENT accent color
    borderSubtle: `rgba(${accentRgb}, 0.3)`, // Increased from 0.15
    borderDefault: `rgba(${accentRgb}, 0.5)`, // Increased from 0.25
    borderStrong: `rgba(${accentRgb}, 0.7)`, // Increased from 0.4
    
    // Interactive states with accent prominence
    hoverGlow: `rgba(${accentRgb}, 0.3)`, // Changed to accent and increased
    focusRing: `rgba(${accentRgb}, 0.6)`, // Increased from 0.5
    
    // Card overlays - more subtle
    cardOverlay: `linear-gradient(135deg, rgba(${primaryRgb}, 0.03) 0%, rgba(${accentRgb}, 0.02) 100%)`, // Much more subtle
  };
}

/**
 * Apply a color palette to CSS variables
 */
export function applyColorPalette(primaryHex: string, accentHex: string) {
  const palette = generateColorPalette(primaryHex, accentHex);
  const root = document.documentElement;
  
  // Apply primary colors
  root.style.setProperty('--user-primary', palette.primary);
  root.style.setProperty('--user-primary-rgb', palette.primaryRgb);
  root.style.setProperty('--user-accent', palette.accent);
  root.style.setProperty('--user-accent-rgb', palette.accentRgb);
  
  // Apply background hierarchy
  root.style.setProperty('--user-bg-base', palette.bgBase);
  root.style.setProperty('--user-bg-card', palette.bgCard);
  root.style.setProperty('--user-bg-elevated', palette.bgElevated);
  root.style.setProperty('--user-bg-hover', palette.bgHover);
  
  // Apply navigation styles
  root.style.setProperty('--user-nav-bg', palette.navBg);
  root.style.setProperty('--user-nav-border', palette.navBorder);
  
  // Apply borders
  root.style.setProperty('--user-border-subtle', palette.borderSubtle);
  root.style.setProperty('--user-border-default', palette.borderDefault);
  root.style.setProperty('--user-border-strong', palette.borderStrong);
  
  // Apply interactive states
  root.style.setProperty('--user-hover-glow', palette.hoverGlow);
  root.style.setProperty('--user-focus-ring', palette.focusRing);
  root.style.setProperty('--user-card-overlay', palette.cardOverlay);
}