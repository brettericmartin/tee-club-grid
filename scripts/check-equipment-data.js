import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipment() {
  console.log('📊 Checking equipment data...\n');

  const { data, error, count } = await supabase
    .from('equipment')
    .select('*', { count: 'exact' })
    .limit(10)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total equipment items: ${count}\n`);
  
  // Group by category
  const { data: categories } = await supabase
    .from('equipment')
    .select('category')
    .order('category');
    
  const categoryCounts = {};
  categories?.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });
  
  console.log('📂 Categories:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count} items`);
  });
  
  // Check images
  const { data: withImages } = await supabase
    .from('equipment')
    .select('id')
    .not('image_url', 'is', null)
    .limit(1000);
    
  console.log(`\n🖼️  Items with images: ${withImages?.length || 0}`);
  
  // Show recent items
  console.log('\n🆕 Recent items added:');
  data?.slice(0, 5).forEach(item => {
    console.log(`  - ${item.brand} ${item.model} ($${item.msrp})`);
    if (item.image_url) {
      console.log(`    Image: ${item.image_url.substring(0, 60)}...`);
    }
  });
}

checkEquipment().catch(console.error);