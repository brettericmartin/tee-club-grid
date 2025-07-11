import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFairwayWoodDuplicates() {
  console.log('\n🔧 Fixing Fairway Wood Duplicates\n');
  console.log('==================================\n');

  try {
    // 1. Find all fairway wood items grouped by brand/model
    console.log('1. Finding duplicate fairway woods...\n');
    
    const { data: allWoods } = await supabase
      .from('equipment')
      .select('id, brand, model, category, created_at')
      .or('category.eq.fairway_wood,category.eq.wood,category.eq.woods')
      .order('created_at');

    if (!allWoods || allWoods.length === 0) {
      console.log('No fairway woods found.');
      return;
    }

    // Group by brand+model to find duplicates
    const groups = {};
    allWoods.forEach(item => {
      const key = `${item.brand}|||${item.model}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Find groups with duplicates
    const duplicateGroups = Object.entries(groups).filter(([_, items]) => items.length > 1);
    
    if (duplicateGroups.length === 0) {
      console.log('No duplicates found. Proceeding to standardize categories...');
    } else {
      console.log(`Found ${duplicateGroups.length} groups with duplicates:\n`);
      
      for (const [key, items] of duplicateGroups) {
        const [brand, model] = key.split('|||');
        console.log(`\n${brand} ${model}:`);
        items.forEach(item => {
          console.log(`  - ID: ${item.id.substring(0, 8)}... Category: ${item.category} Created: ${new Date(item.created_at).toLocaleDateString()}`);
        });
        
        // Keep the one with 'fairway_wood' category if it exists, otherwise keep the oldest
        const fairwayWoodItem = items.find(item => item.category === 'fairway_wood');
        const itemToKeep = fairwayWoodItem || items[0]; // items are ordered by created_at
        const itemsToDelete = items.filter(item => item.id !== itemToKeep.id);
        
        console.log(`  ✓ Keeping: ${itemToKeep.category} (${itemToKeep.id.substring(0, 8)}...)`);
        console.log(`  × Deleting: ${itemsToDelete.length} duplicate(s)`);
        
        // Delete duplicates
        for (const item of itemsToDelete) {
          const { error } = await supabase
            .from('equipment')
            .delete()
            .eq('id', item.id);
          
          if (error) {
            console.error(`    Error deleting ${item.id}:`, error.message);
          }
        }
      }
    }

    // 2. Now standardize all remaining categories to 'fairway_wood'
    console.log('\n\n2. Standardizing categories to "fairway_wood"...\n');
    
    const categoriesToFix = ['wood', 'woods'];
    
    for (const oldCategory of categoriesToFix) {
      const { data: itemsToUpdate, error: fetchError } = await supabase
        .from('equipment')
        .select('id')
        .eq('category', oldCategory);
      
      if (fetchError) {
        console.error(`Error fetching ${oldCategory}:`, fetchError.message);
        continue;
      }
      
      if (itemsToUpdate && itemsToUpdate.length > 0) {
        console.log(`Updating ${itemsToUpdate.length} items from "${oldCategory}" to "fairway_wood"...`);
        
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ category: 'fairway_wood' })
          .eq('category', oldCategory);
        
        if (updateError) {
          console.error(`Error updating ${oldCategory}:`, updateError.message);
        } else {
          console.log(`✅ Successfully updated ${itemsToUpdate.length} items`);
        }
      }
    }

    // 3. Verify final state
    console.log('\n\n3. Verifying final state...\n');
    
    const { data: finalWoods, count } = await supabase
      .from('equipment')
      .select('brand, model', { count: 'exact' })
      .eq('category', 'fairway_wood');
    
    console.log(`✅ Total fairway woods with correct category: ${count}`);
    
    if (finalWoods && finalWoods.length > 0) {
      console.log('\nSample fairway woods:');
      finalWoods.slice(0, 5).forEach(fw => {
        console.log(`  - ${fw.brand} ${fw.model}`);
      });
    }

    console.log('\n==================================');
    console.log('✅ Fairway wood duplicates fixed!');
    console.log('All fairway woods should now appear in the equipment selector.\n');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixFairwayWoodDuplicates().catch(console.error);