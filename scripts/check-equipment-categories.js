import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEquipmentCategories() {
  console.log('\n🏌️ Checking Equipment Categories\n');
  console.log('================================\n');

  // 1. Get all unique categories
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('category, brand, model')
    .order('category');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by category
  const categoryCounts = {};
  equipment.forEach(item => {
    if (!categoryCounts[item.category]) {
      categoryCounts[item.category] = [];
    }
    categoryCounts[item.category].push(`${item.brand} ${item.model}`);
  });

  console.log('Categories found in database:\n');
  Object.entries(categoryCounts).forEach(([category, items]) => {
    console.log(`${category}: ${items.length} items`);
    if (category.includes('wood') || category.includes('fairway')) {
      console.log('  Sample items:', items.slice(0, 3).join(', '));
    }
  });

  // 2. Search specifically for fairway woods
  console.log('\n\nSearching for fairway woods...');
  
  const { data: fairwayWoods, error: fwError } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('category.eq.fairway_wood,category.eq.fairway,category.eq.wood,model.ilike.%fairway%')
    .limit(10);

  if (fairwayWoods && fairwayWoods.length > 0) {
    console.log(`\nFound ${fairwayWoods.length} potential fairway woods:`);
    fairwayWoods.forEach(fw => {
      console.log(`- ${fw.brand} ${fw.model} (category: ${fw.category})`);
    });
  } else {
    console.log('No fairway woods found with common category names');
  }

  // 3. Check if there's a category mismatch
  console.log('\n\nChecking for category mismatches...');
  const { data: woodCategories } = await supabase
    .from('equipment')
    .select('category')
    .ilike('category', '%wood%');

  if (woodCategories) {
    const uniqueWoodCategories = [...new Set(woodCategories.map(w => w.category))];
    console.log('Wood-related categories:', uniqueWoodCategories);
  }

  console.log('\n================================\n');
}

checkEquipmentCategories().catch(console.error);