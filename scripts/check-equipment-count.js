import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipment() {
  // Get total equipment count
  const { count: totalCount } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total equipment in database: ${totalCount || 0}`);
  
  // Get count by category
  const { data: categories } = await supabase
    .from('equipment')
    .select('category')
    .order('category');
    
  if (categories && categories.length > 0) {
    const categoryCounts = {};
    categories.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    console.log('\nEquipment by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    // Show a few sample equipment
    const { data: samples } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .limit(5);
      
    console.log('\nSample equipment:');
    samples?.forEach(eq => {
      console.log(`  - ${eq.brand} ${eq.model} (${eq.category})`);
    });
  }
}

checkEquipment();