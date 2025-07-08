import { supabase } from '@/lib/supabase';
import { allEquipment as hardcodedEquipment } from '@/lib/equipment-database';
import { normalizeCategory, EQUIPMENT_CATEGORIES } from '@/lib/equipment-categories';

// Generate consistent IDs for equipment
export function generateEquipmentId(brand: string, model: string, year?: number): string {
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  const yearStr = year ? `-${year}` : '';
  return `${brandSlug}-${modelSlug}${yearStr}`;
}

// Migrate hardcoded equipment to Supabase
export async function migrateEquipmentToSupabase() {
  const results = {
    migrated: [] as string[],
    updated: [] as string[],
    errors: [] as { item: string; error: string }[]
  };

  for (const item of hardcodedEquipment) {
    try {
      // Normalize the category
      const normalizedCategory = normalizeCategory(item.category);
      
      // Check if equipment already exists by brand and model
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('brand', item.brand)
        .eq('model', item.model)
        .single();

      if (existing) {
        // Update existing equipment to ensure consistency
        const { error } = await supabase
          .from('equipment')
          .update({
            category: normalizedCategory,
            image_url: item.image,
            msrp: item.msrp,
            specs: item.specs || {}
          })
          .eq('id', existing.id);

        if (error) throw error;
        results.updated.push(`${item.brand} ${item.model}`);
      } else {
        // Insert new equipment
        const { error } = await supabase
          .from('equipment')
          .insert({
            id: generateEquipmentId(item.brand, item.model),
            brand: item.brand,
            model: item.model,
            category: normalizedCategory,
            image_url: item.image,
            msrp: item.msrp,
            specs: item.specs || {},
            release_date: item.releaseYear ? `${item.releaseYear}-01-01` : null
          });

        if (error) throw error;
        results.migrated.push(`${item.brand} ${item.model}`);
      }
    } catch (error: any) {
      results.errors.push({
        item: `${item.brand} ${item.model}`,
        error: error.message
      });
    }
  }

  return results;
}

// Fix category inconsistencies in existing data
export async function fixEquipmentCategories() {
  try {
    // Get all equipment
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, category');

    if (error) throw error;

    const updates = [];
    
    for (const item of equipment || []) {
      const normalizedCategory = normalizeCategory(item.category);
      
      if (normalizedCategory !== item.category) {
        updates.push({
          id: item.id,
          category: normalizedCategory
        });
      }
    }

    // Batch update categories
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('equipment')
          .update({ category: update.category })
          .eq('id', update.id);
      }
    }

    return {
      fixed: updates.length,
      categories: Object.values(EQUIPMENT_CATEGORIES)
    };
  } catch (error) {
    console.error('Error fixing categories:', error);
    throw error;
  }
}

// Remove duplicate equipment entries
export async function deduplicateEquipment() {
  try {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: true });

    const seen = new Map<string, any>();
    const duplicates = [];

    for (const item of equipment || []) {
      const key = `${item.brand.toLowerCase()}-${item.model.toLowerCase()}`;
      
      if (seen.has(key)) {
        duplicates.push({
          duplicate: item,
          original: seen.get(key)
        });
      } else {
        seen.set(key, item);
      }
    }

    // Handle duplicates - merge photos and reviews, then delete
    for (const { duplicate, original } of duplicates) {
      // Move photos to original
      await supabase
        .from('equipment_photos')
        .update({ equipment_id: original.id })
        .eq('equipment_id', duplicate.id);

      // Move reviews to original
      await supabase
        .from('equipment_reviews')
        .update({ equipment_id: original.id })
        .eq('equipment_id', duplicate.id);

      // Move wishlist items
      await supabase
        .from('equipment_wishlist')
        .update({ equipment_id: original.id })
        .eq('equipment_id', duplicate.id);

      // Delete duplicate
      await supabase
        .from('equipment')
        .delete()
        .eq('id', duplicate.id);
    }

    return {
      duplicatesRemoved: duplicates.length,
      remaining: seen.size
    };
  } catch (error) {
    console.error('Error deduplicating:', error);
    throw error;
  }
}

// Update bag equipment references to use correct IDs
export async function updateBagEquipmentReferences() {
  try {
    // Get all bag equipment with invalid references
    const { data: bagEquipment } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        equipment_id,
        equipment:equipment_id (
          id,
          brand,
          model
        )
      `);

    const invalidRefs = (bagEquipment || []).filter(item => !item.equipment);
    
    // Try to match by brand/model
    for (const ref of invalidRefs) {
      // Extract brand and model from old ID format
      const parts = ref.equipment_id.split('-');
      if (parts.length >= 2) {
        const possibleBrand = parts[0];
        const possibleModel = parts.slice(1).join(' ');

        // Try to find matching equipment
        const { data: matches } = await supabase
          .from('equipment')
          .select('id')
          .ilike('brand', `%${possibleBrand}%`)
          .ilike('model', `%${possibleModel}%`)
          .limit(1);

        if (matches && matches.length > 0) {
          // Update reference
          await supabase
            .from('bag_equipment')
            .update({ equipment_id: matches[0].id })
            .eq('id', ref.id);
        }
      }
    }

    return {
      invalidReferences: invalidRefs.length,
      message: 'References updated where possible'
    };
  } catch (error) {
    console.error('Error updating references:', error);
    throw error;
  }
}