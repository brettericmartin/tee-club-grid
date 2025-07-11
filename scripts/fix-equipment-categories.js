import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEquipmentCategories() {
  console.log('\n🔧 Fixing Equipment Categories\n');
  console.log('==============================\n');

  // Category normalization map
  const categoryMap = {
    'wood': 'fairway_wood',
    'woods': 'fairway_wood',
    'irons': 'iron',
    'wedges': 'wedge',
    'putters': 'putter',
    'golf_ball': 'ball'
  };

  try {
    // 1. First, let's see what we're dealing with
    console.log('1. Current category counts:');
    for (const [oldCategory, newCategory] of Object.entries(categoryMap)) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', oldCategory);
      
      console.log(`   ${oldCategory} → ${newCategory}: ${count || 0} items`);
    }

    // 2. Update categories
    console.log('\n2. Updating categories...');
    
    for (const [oldCategory, newCategory] of Object.entries(categoryMap)) {
      const { data, error } = await supabase
        .from('equipment')
        .update({ category: newCategory })
        .eq('category', oldCategory)
        .select();
      
      if (error) {
        console.error(`   ❌ Error updating ${oldCategory}:`, error.message);
      } else {
        console.log(`   ✅ Updated ${data?.length || 0} items from ${oldCategory} to ${newCategory}`);
      }
    }

    // 3. Verify the updates
    console.log('\n3. Verification - Updated category counts:');
    const standardCategories = [
      'driver', 'fairway_wood', 'hybrid', 'utility_iron', 
      'iron', 'wedge', 'putter', 'ball', 'bags',
      'gloves', 'ball_marker', 'tees', 'towels', 'speakers'
    ];

    for (const category of standardCategories) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', category);
      
      if (count > 0) {
        console.log(`   ${category}: ${count} items`);
      }
    }

    // 4. Check for any remaining non-standard categories
    console.log('\n4. Checking for non-standard categories...');
    const { data: allCategories } = await supabase
      .from('equipment')
      .select('category')
      .not('category', 'in', `(${standardCategories.map(c => `'${c}'`).join(',')})`);

    if (allCategories && allCategories.length > 0) {
      const uniqueCategories = [...new Set(allCategories.map(item => item.category))];
      console.log('   ⚠️  Non-standard categories found:', uniqueCategories);
    } else {
      console.log('   ✅ All categories are now standardized!');
    }

    console.log('\n==============================\n');
    console.log('Category standardization complete!');
    console.log('All fairway woods should now appear in the equipment selector.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixEquipmentCategories().catch(console.error);