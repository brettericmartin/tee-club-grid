import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugCategoryImages() {
  console.log('🐛 Debugging Category Images Loading...\n');
  
  const categories = ['ball', 'driver', 'putter', 'iron', 'wedge'];
  
  for (const category of categories) {
    console.log(`\n📂 Category: ${category}`);
    
    // Check if there are any photos for this category
    const { data: allPhotos, error: allError } = await supabase
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
      .eq('equipment.category', category);
      
    if (allError) {
      console.error(`❌ Error querying photos for ${category}:`, allError.message);
      continue;
    }
    
    console.log(`📸 Total photos for ${category}: ${allPhotos?.length || 0}`);
    
    if (allPhotos && allPhotos.length > 0) {
      // Show top 3 photos by likes
      const sortedPhotos = allPhotos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      console.log('Top photos:');
      sortedPhotos.slice(0, 3).forEach((photo, i) => {
        console.log(`  ${i + 1}. ${photo.equipment.brand} ${photo.equipment.model} - ${photo.likes_count || 0} likes`);
        console.log(`      URL: ${photo.photo_url.substring(0, 60)}...`);
      });
      
      // Test the exact query used in the hook
      const { data: mostLikedPhoto, error: queryError } = await supabase
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
        
      if (queryError) {
        console.error(`❌ Hook query error for ${category}:`, queryError.message);
      } else if (mostLikedPhoto && mostLikedPhoto.length > 0) {
        const photo = mostLikedPhoto[0];
        console.log(`✅ Hook would return: ${photo.equipment.brand} ${photo.equipment.model} (${photo.likes_count} likes)`);
      } else {
        console.log(`⚪ Hook query returned no results for ${category}`);
      }
    } else {
      console.log(`⚪ No photos found for ${category}`);
      
      // Check if there's any equipment with image_url for fallback
      const { data: equipmentWithImage } = await supabase
        .from('equipment')
        .select('brand, model, image_url')
        .eq('category', category)
        .not('image_url', 'is', null)
        .limit(1);
        
      if (equipmentWithImage && equipmentWithImage.length > 0) {
        console.log(`📷 Fallback available: ${equipmentWithImage[0].brand} ${equipmentWithImage[0].model}`);
        console.log(`    URL: ${equipmentWithImage[0].image_url?.substring(0, 60)}...`);
      } else {
        console.log(`❌ No fallback image available for ${category}`);
      }
    }
  }
}

debugCategoryImages().catch(console.error);