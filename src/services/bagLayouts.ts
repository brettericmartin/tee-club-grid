import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

export interface LayoutItem {
  position: number;
  size: number;
  x?: number;
  y?: number;
}

export type BagLayout = Record<string, LayoutItem>;

type UserBag = Database['public']['Tables']['user_bags']['Row'];

export const bagLayoutsService = {
  /**
   * Load layout data for a specific bag
   */
  async loadLayout(bagId: string): Promise<BagLayout | null> {
    try {
      const { data, error } = await supabase
        .from('user_bags')
        .select('layout_data')
        .eq('id', bagId)
        .single();

      if (error) {
        console.error('Error loading bag layout:', error);
        return null;
      }

      return (data?.layout_data as BagLayout) || {};
    } catch (error) {
      console.error('Error in loadLayout:', error);
      return null;
    }
  },

  /**
   * Save layout data for a specific bag
   */
  async saveLayout(bagId: string, layout: BagLayout): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_bags')
        .update({ 
          layout_data: layout,
          updated_at: new Date().toISOString()
        })
        .eq('id', bagId);

      if (error) {
        console.error('Error saving bag layout:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveLayout:', error);
      return false;
    }
  },

  /**
   * Generate default layout based on equipment categories
   */
  generateDefaultLayout(equipment: Array<{ id: string; category: string }>): BagLayout {
    const layout: BagLayout = {};
    
    // Equipment size multipliers
    const sizes: Record<string, number> = {
      drivers: 1.5,
      putters: 1.5,
      woods: 1.25,
      hybrids: 1.25,
      iron_sets: 1.25,
      wedges: 1.0,
      balls: 1.0,
      bags: 1.0,
      gloves: 1.0,
      rangefinders: 1.0,
      accessories: 1.0,
    };

    // Category priority order
    const categoryOrder = [
      'drivers', 'woods', 'hybrids', 'iron_sets', 
      'wedges', 'putters', 'balls', 'bags', 
      'gloves', 'rangefinders', 'accessories'
    ];

    // Sort equipment by category priority
    const sortedEquipment = [...equipment].sort((a, b) => {
      const orderA = categoryOrder.indexOf(a.category);
      const orderB = categoryOrder.indexOf(b.category);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });

    // Assign positions and sizes
    sortedEquipment.forEach((item, index) => {
      layout[item.id] = {
        position: index,
        size: sizes[item.category] || 1.0,
      };
    });

    return layout;
  },

  /**
   * Apply a preset layout template
   */
  applyPresetLayout(
    equipment: Array<{ id: string; category: string }>, 
    preset: 'hero-driver' | 'balanced' | 'compact'
  ): BagLayout {
    const layout: BagLayout = {};
    
    switch (preset) {
      case 'hero-driver':
        // Driver and putter get hero treatment
        equipment.forEach((item, index) => {
          let size = 1.0;
          if (item.category === 'drivers' || item.category === 'putters') {
            size = 1.5;
          } else if (['woods', 'hybrids', 'iron_sets'].includes(item.category)) {
            size = 1.25;
          }
          layout[item.id] = { position: index, size };
        });
        break;

      case 'balanced':
        // All clubs get equal prominence
        equipment.forEach((item, index) => {
          const isClub = ['drivers', 'woods', 'hybrids', 'iron_sets', 'wedges', 'putters'].includes(item.category);
          layout[item.id] = { 
            position: index, 
            size: isClub ? 1.25 : 1.0 
          };
        });
        break;

      case 'compact':
        // Minimize space, all items standard size
        equipment.forEach((item, index) => {
          layout[item.id] = { position: index, size: 1.0 };
        });
        break;

      default:
        return this.generateDefaultLayout(equipment);
    }

    return layout;
  },

  /**
   * Calculate optimal grid dimensions based on layout
   */
  calculateGridDimensions(layout: BagLayout): { columns: number; rows: number } {
    const items = Object.values(layout);
    const totalArea = items.reduce((sum, item) => sum + (item.size * item.size), 0);
    
    // Estimate grid size based on total area
    const columns = Math.ceil(Math.sqrt(totalArea / 1.5));
    const rows = Math.ceil(items.length / columns);

    return { columns: Math.max(2, Math.min(columns, 4)), rows };
  },

  /**
   * Validate layout data structure
   */
  validateLayout(layout: unknown): layout is BagLayout {
    if (!layout || typeof layout !== 'object') return false;

    return Object.values(layout).every(item => 
      typeof item === 'object' &&
      typeof item.position === 'number' &&
      typeof item.size === 'number' &&
      item.size >= 1.0 && item.size <= 2.0
    );
  }
};