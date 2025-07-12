import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testEquipmentSelector() {
  console.log('🧪 Testing Equipment Selector Data Flow...\n');
  
  const categories = [
    'driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter', 
    'ball', 'bag', 'glove', 'rangefinder', 'gps'
  ];
  
  console.log('📊 Category availability:');
  
  for (const category of categories) {
    // Test category -> brands -> equipment flow
    const { data: brands, error: brandsError } = await supabase
      .from('equipment')
      .select('brand')
      .eq('category', category);
      
    if (brandsError) {
      console.error(`❌ Error loading brands for ${category}:`, brandsError.message);
      continue;
    }
    
    const uniqueBrands = [...new Set(brands.map(item => item.brand))].filter(Boolean);
    
    if (uniqueBrands.length === 0) {
      console.log(`⚪ ${category}: No equipment found`);
      continue;
    }
    
    console.log(`✅ ${category}: ${brands.length} items, ${uniqueBrands.length} brands`);
    
    // Test a sample brand
    const sampleBrand = uniqueBrands[0];
    const { data: equipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('category', category)
      .eq('brand', sampleBrand)
      .limit(3);
      
    console.log(`   Sample from ${sampleBrand}:`);
    equipment?.forEach(item => {
      console.log(`     - ${item.model}`);
    });
  }
  
  console.log('\n🏐 Special test: TP5 in ball category');
  const { data: tp5Test } = await supabase
    .from('equipment')
    .select('brand, model, category')
    .eq('category', 'ball')
    .eq('brand', 'TaylorMade')
    .ilike('model', '%TP5%');
    
  if (tp5Test && tp5Test.length > 0) {
    console.log('✅ TP5 found in ball category:');
    tp5Test.forEach(item => {
      console.log(`   ${item.brand} ${item.model}`);
    });
  } else {
    console.log('❌ TP5 not found in ball category');
  }
  
  console.log('\n📡 Special test: Rangefinder category');
  const { data: rangefinders } = await supabase
    .from('equipment')
    .select('brand, model')
    .eq('category', 'rangefinder')
    .limit(3);
    
  if (rangefinders && rangefinders.length > 0) {
    console.log('✅ Rangefinders found:');
    rangefinders.forEach(item => {
      console.log(`   ${item.brand} ${item.model}`);
    });
  } else {
    console.log('❌ No rangefinders found');
  }
  
  console.log('\n🖼️  Testing category images...');
  for (const category of ['ball', 'driver', 'putter']) {
    const { data: withPhotos } = await supabase
      .from('equipment_photos')
      .select(`
        photo_url,
        likes_count,
        equipment:equipment!inner(
          brand,
          model,
          category
        )
      `)
      .eq('equipment.category', category)
      .order('likes_count', { ascending: false })
      .limit(1);

    if (withPhotos && withPhotos.length > 0) {
      const photo = withPhotos[0];
      console.log(`📸 ${category}: ${photo.equipment.brand} ${photo.equipment.model} (${photo.likes_count} likes)`);
    } else {
      console.log(`⚪ ${category}: No photos available`);
    }
  }
  
  console.log('\n✅ Equipment selector test complete!');
}

testEquipmentSelector().catch(console.error);