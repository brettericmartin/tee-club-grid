import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
  console.log('\n🔍 Checking for Duplicate Equipment\n');
  console.log('===================================\n');

  // Check for specific duplicates
  const duplicateChecks = [
    { from: 'wood', to: 'fairway_wood' },
    { from: 'golf_ball', to: 'ball' },
    { from: 'irons', to: 'iron' },
    { from: 'putters', to: 'putter' }
  ];

  for (const check of duplicateChecks) {
    console.log(`\nChecking ${check.from} → ${check.to}:`);
    
    // Get items with old category
    const { data: oldItems } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('category', check.from);

    if (oldItems && oldItems.length > 0) {
      console.log(`Found ${oldItems.length} items with category '${check.from}':`);
      
      // Check if same brand/model exists with new category
      for (const item of oldItems) {
        const { data: existing } = await supabase
          .from('equipment')
          .select('id, category')
          .eq('brand', item.brand)
          .eq('model', item.model)
          .eq('category', check.to);

        if (existing && existing.length > 0) {
          console.log(`  ⚠️  Duplicate: ${item.brand} ${item.model} exists in both '${check.from}' and '${check.to}'`);
        }
      }
    }
  }

  // Show all fairway wood items
  console.log('\n\nAll fairway wood related items:');
  const { data: fairwayItems } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('category.eq.fairway_wood,category.eq.wood,category.eq.woods');

  if (fairwayItems) {
    fairwayItems.forEach(item => {
      console.log(`- ${item.brand} ${item.model} (${item.category}) [${item.id.substring(0, 8)}...]`);
    });
  }

  console.log('\n===================================\n');
}

checkDuplicates().catch(console.error);