import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipmentSummary() {
  console.log('📊 Equipment Database Summary\n');
  
  try {
    // Total count
    const { count: totalCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total Equipment Items: ${totalCount}`);
    
    // Category breakdown
    const { data: categories } = await supabase
      .from('equipment')
      .select('category');
    
    const categoryCount = {};
    categories.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    
    console.log('\nCategory Distribution:');
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} items`);
      });
    
    // Check image coverage
    const { data: imageData } = await supabase
      .from('equipment')
      .select('image_url');
    
    const withImages = imageData.filter(item => item.image_url).length;
    const withSupabaseImages = imageData.filter(item => 
      item.image_url && item.image_url.includes('supabase')
    ).length;
    
    console.log('\nImage Coverage:');
    console.log(`  Total with images: ${withImages} (${Math.round(withImages/totalCount*100)}%)`);
    console.log(`  Supabase images: ${withSupabaseImages}`);
    console.log(`  External images: ${withImages - withSupabaseImages}`);
    console.log(`  Missing images: ${totalCount - withImages}`);
    
    // Brand distribution
    const { data: brands } = await supabase
      .from('equipment')
      .select('brand');
    
    const brandCount = {};
    brands.forEach(item => {
      brandCount[item.brand] = (brandCount[item.brand] || 0) + 1;
    });
    
    console.log('\nTop 10 Brands:');
    Object.entries(brandCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} items`);
      });
    
    // Price range
    const { data: priceData } = await supabase
      .from('equipment')
      .select('msrp')
      .not('msrp', 'is', null);
    
    if (priceData.length > 0) {
      const prices = priceData.map(item => parseFloat(item.msrp));
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      console.log('\nPrice Statistics:');
      console.log(`  Items with pricing: ${priceData.length}`);
      console.log(`  Average price: $${avgPrice.toFixed(2)}`);
      console.log(`  Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
    }
    
    // Recent additions
    const { data: recentItems } = await supabase
      .from('equipment')
      .select('brand, model, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\nMost Recent Additions:');
    recentItems.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString();
      console.log(`  ${item.brand} ${item.model} - ${date}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEquipmentSummary().catch(console.error);