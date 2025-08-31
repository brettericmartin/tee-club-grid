import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipmentTable() {
  console.log('Checking equipment table...\n');
  
  // Get total count
  const { count: totalCount } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total equipment items: ${totalCount}`);
  
  // Get sample of equipment
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .limit(5);
    
  if (error) {
    console.error('Error loading equipment:', error);
    return;
  }
  
  console.log('\nSample equipment:');
  data?.forEach(item => {
    console.log(`- ${item.brand} ${item.model} (${item.category})`);
  });
  
  // Check categories
  const { data: categories } = await supabase
    .from('equipment')
    .select('category')
    .limit(1000);
    
  const uniqueCategories = [...new Set(categories?.map(c => c.category))];
  console.log('\nUnique categories:', uniqueCategories);
}

checkEquipmentTable().catch(console.error);