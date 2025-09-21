import dotenv from 'dotenv';
import { supabase } from './supabase-admin.js';

dotenv.config();

async function fixEquipmentPhotos() {
  console.log('=== Fixing Equipment Photo URLs ===\n');
  
  try {
    // 1. Find all equipment with NULL or placeholder image_urls
    const { data: equipmentToFix, error: fetchError } = await supabase
      .from('equipment')
      .select('id, brand, model, category, image_url')
      .or('image_url.is.null,image_url.ilike.%placehold%');
      
    if (fetchError) {
      console.error('Error fetching equipment:', fetchError);
      return;
    }
    
    console.log(`Found ${equipmentToFix?.length || 0} equipment items with NULL or placeholder images\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const item of equipmentToFix || []) {
      // Check if there are any community photos for this equipment
      const { data: photos, error: photoError } = await supabase
        .from('equipment_photos')
        .select('photo_url, likes_count')
        .eq('equipment_id', item.id)
        .not('photo_url', 'ilike', '%placehold%')
        .order('likes_count', { ascending: false })
        .limit(1);
        
      if (photoError) {
        console.error(`Error fetching photos for ${item.brand} ${item.model}:`, photoError);
        continue;
      }
      
      if (photos && photos.length > 0 && photos[0].photo_url) {
        // Update the equipment with the most liked photo
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: photos[0].photo_url })
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`Error updating ${item.brand} ${item.model}:`, updateError);
        } else {
          console.log(`✓ Updated ${item.brand} ${item.model} with community photo`);
          updated++;
        }
      } else {
        console.log(`✗ Skipped ${item.brand} ${item.model} - no community photos available`);
        skipped++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Updated: ${updated} equipment items`);
    console.log(`Skipped: ${skipped} equipment items (no photos available)`);
    
    // 2. Show remaining items without photos
    if (skipped > 0) {
      console.log('\n=== Equipment Still Needing Photos ===');
      const { data: stillNeedPhotos } = await supabase
        .from('equipment')
        .select('brand, model, category')
        .or('image_url.is.null,image_url.ilike.%placehold%')
        .limit(20);
        
      stillNeedPhotos?.forEach(item => {
        console.log(`  - ${item.brand} ${item.model} (${item.category})`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixEquipmentPhotos().catch(console.error);