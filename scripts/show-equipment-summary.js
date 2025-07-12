import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function showEquipmentSummary() {
  console.log('🏌️ Teed.club Equipment Database Summary\n');
  
  // Get total count
  const { count } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total Equipment: ${count} items\n`);
  
  // Show by category
  const { data: categories } = await supabase
    .from('equipment')
    .select('category')
    .order('category');
    
  const categoryCounts = {};
  categories?.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });
  
  console.log('📊 Equipment by Category:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(15)} ${count} items`);
  });
  
  // Show by brand
  const { data: brands } = await supabase
    .from('equipment')
    .select('brand')
    .order('brand');
    
  const brandCounts = {};
  brands?.forEach(item => {
    brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
  });
  
  console.log('\n🏷️  Equipment by Brand:');
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand.padEnd(20)} ${count} items`);
    });
  
  // Show newest additions
  const { data: newest } = await supabase
    .from('equipment')
    .select('brand, model, category, image_url')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('\n🆕 Newest Equipment:');
  newest?.forEach(item => {
    console.log(`  ${item.brand} ${item.model} (${item.category})`);
    console.log(`    Image: ${item.image_url ? '✅' : '❌'}`);
  });
  
  // Check images
  const { data: withImages } = await supabase
    .from('equipment')
    .select('id')
    .not('image_url', 'is', null)
    .not('image_url', 'like', '%unsplash%');
    
  console.log(`\n🖼️  Equipment with Product Images: ${withImages?.length || 0} / ${count}`);
  
  // Sample equipment by category
  console.log('\n📸 Sample Equipment:');
  for (const cat of ['driver', 'iron', 'putter', 'balls', 'bags']) {
    const { data: sample } = await supabase
      .from('equipment')
      .select('brand, model, msrp')
      .eq('category', cat)
      .limit(3);
      
    console.log(`\n  ${cat}:`);
    sample?.forEach(item => {
      console.log(`    • ${item.brand} ${item.model} - $${item.msrp}`);
    });
  }
}

showEquipmentSummary().catch(console.error);