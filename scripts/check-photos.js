import dotenv from 'dotenv';
import { supabase } from './supabase-admin.js';

dotenv.config();

async function checkPhotos() {
  
  // Check Callaway Paradym equipment
  const { data: equipment, error: eqError } = await supabase
    .from('equipment')
    .select('id, model, brand, image_url, category')
    .ilike('brand', '%callaway%')
    .ilike('model', '%paradym%')
    .limit(10);
    
  if (eqError) {
    console.error('Error fetching equipment:', eqError);
    return;
  }
    
  console.log('=== Callaway Paradym Equipment ===');
  console.log('Found', equipment?.length || 0, 'items\n');
  
  for (const item of equipment || []) {
    console.log(`${item.brand} ${item.model} (${item.category})`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Image URL: ${item.image_url || 'NULL'}`);
    
    // Check photos for this equipment
    const { data: photos, error: photoError } = await supabase
      .from('equipment_photos')
      .select('id, photo_url, uploaded_by, created_at')
      .eq('equipment_id', item.id)
      .limit(5);
      
    if (photoError) {
      console.error('  Error fetching photos:', photoError);
    } else {
      console.log(`  Photos: ${photos?.length || 0} found`);
      photos?.forEach(photo => {
        console.log(`    - ${photo.photo_url?.substring(0, 50)}...`);
      });
    }
    console.log();
  }
  
  // Check for any equipment with placeholder images
  const { data: placeholders } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .or('image_url.ilike.%placehold%,image_url.is.null')
    .limit(10);
    
  console.log('=== Equipment with placeholder or no images ===');
  console.log('Found', placeholders?.length || 0, 'items');
  placeholders?.forEach(item => {
    console.log(`  ${item.brand} ${item.model}: ${item.image_url || 'NULL'}`);
  });
}

checkPhotos().catch(console.error);