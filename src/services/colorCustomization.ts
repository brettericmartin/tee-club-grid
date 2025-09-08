import { supabase } from "@/lib/supabase";
import { applyColorPalette } from "@/utils/colorUtils";

export interface ColorScheme {
  primaryColor: string;
  accentColor: string;
  themeMode: 'dark' | 'light' | 'auto';
  customGradient?: {
    angle: number;
    colors: string[];
    stops?: number[];
  };
}

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primaryColor: '#10B981',
  accentColor: '#FFD700',
  themeMode: 'dark'
};

// Golf-themed color presets
export const COLOR_PRESETS = {
  'Classic Green': {
    primaryColor: '#10B981',
    accentColor: '#FFD700',
    name: 'Classic Green'
  },
  'Augusta': {
    primaryColor: '#006747',
    accentColor: '#FFD700',
    name: 'Augusta'
  },
  'TaylorMade': {
    primaryColor: '#E31837',
    accentColor: '#000000',
    name: 'TaylorMade'
  },
  'Titleist': {
    primaryColor: '#000000',
    accentColor: '#FF0000',
    name: 'Titleist'
  },
  'Callaway': {
    primaryColor: '#002F6C',
    accentColor: '#FFFFFF',
    name: 'Callaway'
  },
  'Ping': {
    primaryColor: '#FF6B35',
    accentColor: '#000000',
    name: 'Ping'
  },
  'Mizuno': {
    primaryColor: '#002B5C',
    accentColor: '#00A0E3',
    name: 'Mizuno'
  },
  'Cobra': {
    primaryColor: '#FF6600',
    accentColor: '#000000',
    name: 'Cobra'
  }
};

export class ColorCustomizationService {
  /**
   * Save user color preferences to the database
   */
  static async saveColorScheme(userId: string, colorScheme: Partial<ColorScheme>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          primary_color: colorScheme.primaryColor,
          accent_color: colorScheme.accentColor,
          theme_mode: colorScheme.themeMode,
          custom_gradient: colorScheme.customGradient
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Apply colors immediately
      if (colorScheme.primaryColor || colorScheme.accentColor) {
        this.applyColors(colorScheme);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving color scheme:', error);
      return { success: false, error };
    }
  }

  /**
   * Load user color preferences from the database
   */
  static async loadColorScheme(userId: string): Promise<ColorScheme> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('primary_color, accent_color, theme_mode, custom_gradient')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        primaryColor: data?.primary_color || DEFAULT_COLOR_SCHEME.primaryColor,
        accentColor: data?.accent_color || DEFAULT_COLOR_SCHEME.accentColor,
        themeMode: data?.theme_mode || DEFAULT_COLOR_SCHEME.themeMode,
        customGradient: data?.custom_gradient
      };
    } catch (error) {
      console.error('Error loading color scheme:', error);
      return DEFAULT_COLOR_SCHEME;
    }
  }

  /**
   * Apply colors to the DOM using CSS custom properties
   */
  static applyColors(colorScheme: Partial<ColorScheme>) {
    if (colorScheme.primaryColor && colorScheme.accentColor) {
      // Use the enhanced color palette generator
      applyColorPalette(colorScheme.primaryColor, colorScheme.accentColor);
    } else {
      // Fallback to basic application if only one color provided
      const root = document.documentElement;
      
      if (colorScheme.primaryColor) {
        root.style.setProperty('--user-primary', colorScheme.primaryColor);
        root.style.setProperty('--user-primary-rgb', this.hexToRgb(colorScheme.primaryColor));
      }
      
      if (colorScheme.accentColor) {
        root.style.setProperty('--user-accent', colorScheme.accentColor);
        root.style.setProperty('--user-accent-rgb', this.hexToRgb(colorScheme.accentColor));
      }
    }
    
    if (colorScheme.customGradient) {
      const gradient = this.buildGradient(colorScheme.customGradient);
      document.documentElement.style.setProperty('--user-gradient', gradient);
    }
  }

  /**
   * Reset colors to defaults
   */
  static resetColors() {
    const root = document.documentElement;
    root.style.removeProperty('--user-primary');
    root.style.removeProperty('--user-primary-rgb');
    root.style.removeProperty('--user-accent');
    root.style.removeProperty('--user-accent-rgb');
    root.style.removeProperty('--user-gradient');
  }

  /**
   * Convert hex color to RGB values
   */
  private static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '16, 185, 129'; // Default to emerald if invalid
    
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }

  /**
   * Build a CSS gradient string from gradient config
   */
  private static buildGradient(gradient: ColorScheme['customGradient']): string {
    if (!gradient) return '';
    
    const { angle = 180, colors, stops } = gradient;
    
    if (!colors || colors.length < 2) return '';
    
    const colorStops = colors.map((color, i) => {
      const stop = stops?.[i] ?? (i * 100 / (colors.length - 1));
      return `${color} ${stop}%`;
    }).join(', ');
    
    return `linear-gradient(${angle}deg, ${colorStops})`;
  }

  /**
   * Check color contrast for accessibility (WCAG 2.1 AA)
   */
  static checkContrast(foreground: string, background: string): {
    ratio: number;
    passes: boolean;
    recommendation?: string;
  } {
    const getLuminance = (hex: string) => {
      const rgb = this.hexToRgb(hex).split(', ').map(Number);
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = Math.max(getLuminance(foreground), getLuminance(background));
    const l2 = Math.min(getLuminance(foreground), getLuminance(background));
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    
    const passes = ratio >= 4.5; // WCAG AA standard
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      passes,
      recommendation: !passes ? 'Consider using a higher contrast color combination' : undefined
    };
  }

  /**
   * Generate complementary colors
   */
  static generateColorHarmony(baseColor: string): {
    complementary: string;
    triadic: string[];
    analogous: string[];
  } {
    // Convert hex to HSL for color calculations
    const hexToHsl = (hex: string) => {
      const rgb = this.hexToRgb(hex).split(', ').map(n => parseInt(n) / 255);
      const [r, g, b] = rgb;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return [h * 360, s, l];
    };

    const hslToHex = (h: number, s: number, l: number) => {
      h = h / 360;
      
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const [h, s, l] = hexToHsl(baseColor);
    
    return {
      complementary: hslToHex((h + 180) % 360, s, l),
      triadic: [
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l)
      ],
      analogous: [
        hslToHex((h + 30) % 360, s, l),
        hslToHex((h - 30 + 360) % 360, s, l)
      ]
    };
  }
}