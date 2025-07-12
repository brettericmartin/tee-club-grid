import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getCategoryImages() {
  console.log('🖼️  Getting sample images for each category...\n');
  
  const categories = [
    'driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter', 
    'ball', 'bag', 'glove', 'rangefinder', 'gps', 'accessories'
  ];
  
  const categoryImages = {};
  
  for (const category of categories) {
    try {
      // Try to get equipment with photos first
      const { data: withPhotos } = await supabase
        .from('equipment')
        .select(`
          id, brand, model, image_url,
          equipment_photos!inner(photo_url)
        `)
        .eq('category', category)
        .limit(1);
        
      if (withPhotos && withPhotos.length > 0) {
        const item = withPhotos[0];
        const imageUrl = item.equipment_photos[0]?.photo_url || item.image_url;
        categoryImages[category] = {
          imageUrl,
          equipment: `${item.brand} ${item.model}`,
          hasPhoto: !!item.equipment_photos[0]
        };
        console.log(`✅ ${category}: ${item.brand} ${item.model} ${item.equipment_photos[0] ? '(community photo)' : '(image_url)'}`);
        continue;
      }
      
      // Fallback to any equipment with image_url
      const { data: withImageUrl } = await supabase
        .from('equipment')
        .select('id, brand, model, image_url')
        .eq('category', category)
        .not('image_url', 'is', null)
        .limit(1);
        
      if (withImageUrl && withImageUrl.length > 0) {
        const item = withImageUrl[0];
        categoryImages[category] = {
          imageUrl: item.image_url,
          equipment: `${item.brand} ${item.model}`,
          hasPhoto: false
        };
        console.log(`📷 ${category}: ${item.brand} ${item.model} (image_url)`);
        continue;
      }
      
      // Fallback to any equipment
      const { data: anyEquipment } = await supabase
        .from('equipment')
        .select('id, brand, model')
        .eq('category', category)
        .limit(1);
        
      if (anyEquipment && anyEquipment.length > 0) {
        const item = anyEquipment[0];
        categoryImages[category] = {
          imageUrl: null,
          equipment: `${item.brand} ${item.model}`,
          hasPhoto: false
        };
        console.log(`⚪ ${category}: ${item.brand} ${item.model} (no image)`);
      } else {
        console.log(`❌ ${category}: No equipment found`);
      }
      
    } catch (error) {
      console.error(`Error for ${category}:`, error.message);
    }
  }
  
  console.log('\n📋 Category image mapping:');
  console.log('const CATEGORY_IMAGES = {');
  for (const [category, data] of Object.entries(categoryImages)) {
    const imageUrl = data.imageUrl ? `'${data.imageUrl}'` : 'null';
    console.log(`  ${category}: ${imageUrl}, // ${data.equipment}`);
  }
  console.log('};');
  
  return categoryImages;
}

getCategoryImages().catch(console.error);