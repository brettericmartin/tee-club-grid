import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, X, AlertCircle } from "lucide-react";
import { 
  ColorCustomizationService, 
  COLOR_PRESETS, 
  ColorScheme 
} from "@/services/colorCustomization";
import { useAuth } from "@/contexts/AuthContext";

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: Partial<ColorScheme>) => void;
  currentColors?: Partial<ColorScheme>;
}

export function ColorPicker({ isOpen, onClose, onSave, currentColors }: ColorPickerProps) {
  const { user } = useAuth();
  const [primaryColor, setPrimaryColor] = useState(currentColors?.primaryColor || '#10B981');
  const [accentColor, setAccentColor] = useState(currentColors?.accentColor || '#FFD700');
  const [activeTab, setActiveTab] = useState<'primary' | 'accent'>('primary');
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);

  useEffect(() => {
    if (currentColors?.primaryColor) setPrimaryColor(currentColors.primaryColor);
    if (currentColors?.accentColor) setAccentColor(currentColors.accentColor);
  }, [currentColors]);

  // Apply colors in real-time for preview
  useEffect(() => {
    if (isOpen) {
      ColorCustomizationService.applyColors({
        primaryColor,
        accentColor,
        themeMode: 'dark'
      });
    }
  }, [primaryColor, accentColor, isOpen]);

  useEffect(() => {
    // Check contrast between colors
    const contrast = ColorCustomizationService.checkContrast(primaryColor, '#1a1a1a');
    if (!contrast.passes) {
      setContrastWarning(contrast.recommendation || null);
    } else {
      setContrastWarning(null);
    }
  }, [primaryColor, accentColor]);

  const handleSave = async () => {
    const colorScheme: Partial<ColorScheme> = {
      primaryColor,
      accentColor,
      themeMode: 'dark'
    };
    
    if (user) {
      await ColorCustomizationService.saveColorScheme(user.id, colorScheme);
    }
    
    onSave(colorScheme);
    onClose();
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[keyof typeof COLOR_PRESETS]) => {
    setPrimaryColor(preset.primaryColor);
    setAccentColor(preset.accentColor);
  };

  const handleReset = () => {
    setPrimaryColor('#10B981');
    setAccentColor('#FFD700');
  };

  const handleClose = () => {
    // Restore original colors if canceling
    if (currentColors) {
      ColorCustomizationService.applyColors(currentColors);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Palette className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Customize Your Colors</h2>
                      <p className="text-sm text-white/60 mt-1">
                        Personalize your bag profile with custom colors
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                {/* Color Preview */}
                <div className="mb-6 p-4 bg-[#0a0a0a] rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">Preview</span>
                    {contrastWarning && (
                      <div className="flex items-center gap-2 text-yellow-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Low contrast</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div 
                      className="flex-1 h-20 rounded-lg border border-white/10 flex items-center justify-center font-semibold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary
                    </div>
                    <div 
                      className="flex-1 h-20 rounded-lg border border-white/10 flex items-center justify-center font-semibold"
                      style={{ backgroundColor: accentColor }}
                    >
                      Accent
                    </div>
                  </div>
                </div>

                {/* Preset Colors */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Popular Presets</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.values(COLOR_PRESETS).map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="group relative p-3 bg-[#0a0a0a] border border-white/10 rounded-lg hover:border-white/20 transition-all"
                      >
                        <div className="flex gap-1 mb-2">
                          <div 
                            className="w-6 h-6 rounded border border-white/10"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <div 
                            className="w-6 h-6 rounded border border-white/10"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                        </div>
                        <span className="text-xs text-white/60 group-hover:text-white/80">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Selection */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('primary')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      activeTab === 'primary'
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                        : 'bg-[#0a0a0a] text-white/60 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    Primary Color
                  </button>
                  <button
                    onClick={() => setActiveTab('accent')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      activeTab === 'accent'
                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        : 'bg-[#0a0a0a] text-white/60 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    Accent Color
                  </button>
                </div>

                {/* Color Picker */}
                <div className="flex justify-center">
                  <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <HexColorPicker 
                      color={activeTab === 'primary' ? primaryColor : accentColor}
                      onChange={activeTab === 'primary' ? setPrimaryColor : setAccentColor}
                    />
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="text"
                        value={activeTab === 'primary' ? primaryColor : accentColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            activeTab === 'primary' ? setPrimaryColor(value) : setAccentColor(value);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-center font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Harmony Suggestions */}
                <div className="mt-6 p-4 bg-[#0a0a0a] rounded-xl border border-white/5">
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Color Harmony</h3>
                  <div className="space-y-2">
                    {(() => {
                      const harmony = ColorCustomizationService.generateColorHarmony(primaryColor);
                      return (
                        <>
                          <button
                            onClick={() => setAccentColor(harmony.complementary)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <div 
                              className="w-8 h-8 rounded border border-white/20"
                              style={{ backgroundColor: harmony.complementary }}
                            />
                            <span className="text-sm text-white/80">Complementary</span>
                          </button>
                          {harmony.analogous.map((color, i) => (
                            <button
                              key={i}
                              onClick={() => setAccentColor(color)}
                              className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              <div 
                                className="w-8 h-8 rounded border border-white/20"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm text-white/80">Analogous {i + 1}</span>
                            </button>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
                  >
                    Reset to Default
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Colors
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}