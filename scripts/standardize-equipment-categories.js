import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function standardizeCategories() {
  console.log('🔧 Standardizing Equipment Categories...\n');
  
  try {
    // Category mappings to match equipment-categories.ts
    const categoryMappings = {
      'balls': 'ball',           // 35 items
      'irons': 'iron',           // 2 items  
      'putters': 'putter',       // 1 item
      'rangefinders': 'rangefinder'  // 0 items but category exists
    };
    
    let totalUpdated = 0;
    
    for (const [oldCat, newCat] of Object.entries(categoryMappings)) {
      const { count: oldCount } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', oldCat);
        
      if (oldCount > 0) {
        console.log(`Updating ${oldCount} items from "${oldCat}" to "${newCat}"`);
        
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ category: newCat })
          .eq('category', oldCat);
          
        if (updateError) {
          console.error(`❌ Error updating ${oldCat}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${oldCount} items: ${oldCat} → ${newCat}`);
          totalUpdated += oldCount;
        }
      } else {
        console.log(`ℹ️  No items found for category: ${oldCat}`);
      }
    }
    
    console.log(`\n✅ Total items updated: ${totalUpdated}`);
    
    // Verify the changes
    console.log('\n📊 Current categories after update:');
    const { data: newCategories } = await supabase
      .from('equipment')
      .select('category')
      .order('category');
      
    const newUniqueCategories = [...new Set(newCategories.map(item => item.category))];
    
    for (const cat of newUniqueCategories) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      console.log(`  ${cat}: ${count} items`);
    }
    
    // Verify TP5 is now in 'ball' category
    console.log('\n🏐 Verifying TP5 is now in "ball" category...');
    const { data: tp5Data } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .or('model.ilike.%TP5%,model.ilike.%tp5%');
      
    if (tp5Data && tp5Data.length > 0) {
      tp5Data.forEach(item => {
        console.log(`  ✅ ${item.brand} ${item.model} (${item.category})`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

standardizeCategories().catch(console.error);