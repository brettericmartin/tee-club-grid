import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanAllImages() {
  console.log('🧹 Cleaning all default/placeholder images...\n');
  
  try {
    // Get all equipment with images
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, brand, model, image_url')
      .not('image_url', 'is', null);
      
    if (error) throw error;
    
    console.log(`Found ${equipment.length} equipment items with images\n`);
    
    // Update all to null
    const { error: updateError } = await supabase
      .from('equipment')
      .update({ image_url: null })
      .not('image_url', 'is', null);
      
    if (updateError) throw updateError;
    
    console.log(`✅ Cleared images from all ${equipment.length} items`);
    
    // Also clear any equipment_photos entries
    const { data: photos, error: photosError } = await supabase
      .from('equipment_photos')
      .select('id');
      
    if (!photosError && photos?.length > 0) {
      const { error: deleteError } = await supabase
        .from('equipment_photos')
        .delete()
        .gt('id', 0); // Delete all
        
      if (!deleteError) {
        console.log(`✅ Deleted ${photos.length} equipment_photos entries`);
      }
    }
    
    // Show confirmation
    const { count } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .not('image_url', 'is', null);
      
    console.log(`\n✅ Complete! ${count || 0} items still have images (should be 0)`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanAllImages().catch(console.error);