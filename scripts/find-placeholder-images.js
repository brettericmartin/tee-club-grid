import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPlaceholderImages() {
  console.log('=== FINDING PLACEHOLDER IMAGES IN EQUIPMENT TABLE ===\n');
  
  // Find equipment with placeholder images
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .or('image_url.ilike.%placehold%,image_url.ilike.%placeholder%,image_url.ilike.%no-image%,image_url.ilike.%default%');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${equipment.length} equipment items with placeholder images:\n`);
  
  // Group by category
  const byCategory = {};
  equipment.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });
  
  Object.entries(byCategory).forEach(([category, items]) => {
    console.log(`\n${category.toUpperCase()} (${items.length} items):`);
    items.forEach(item => {
      console.log(`  - ${item.brand} ${item.model}`);
      console.log(`    ID: ${item.id}`);
      console.log(`    URL: ${item.image_url}`);
    });
  });
  
  // Check bag_equipment for placeholder custom photos
  console.log('\n=== CHECKING BAG_EQUIPMENT FOR PLACEHOLDER CUSTOM PHOTOS ===\n');
  
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('id, bag_id, equipment_id, custom_photo_url')
    .or('custom_photo_url.ilike.%placehold%,custom_photo_url.ilike.%placeholder%');
    
  if (bagError) {
    console.error('Error:', bagError);
  } else {
    console.log(`Found ${bagEquipment.length} bag equipment items with placeholder custom photos`);
    if (bagEquipment.length > 0) {
      bagEquipment.forEach(item => {
        console.log(`  ID: ${item.id}`);
        console.log(`  Bag ID: ${item.bag_id}`);
        console.log(`  Equipment ID: ${item.equipment_id}`);
        console.log(`  URL: ${item.custom_photo_url}\n`);
      });
    }
  }
  
  // Check equipment_photos for placeholder URLs
  console.log('\n=== CHECKING EQUIPMENT_PHOTOS FOR PLACEHOLDER URLS ===\n');
  
  const { data: photos, error: photoError } = await supabase
    .from('equipment_photos')
    .select('id, equipment_id, photo_url, created_at')
    .or('photo_url.ilike.%placehold%,photo_url.ilike.%placeholder%');
    
  if (photoError) {
    console.error('Error:', photoError);
  } else {
    console.log(`Found ${photos.length} equipment photos with placeholder URLs`);
    if (photos.length > 0) {
      photos.forEach(photo => {
        console.log(`  ID: ${photo.id}`);
        console.log(`  Equipment ID: ${photo.equipment_id}`);
        console.log(`  URL: ${photo.photo_url}`);
        console.log(`  Created: ${photo.created_at}\n`);
      });
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total equipment with placeholder images: ${equipment.length}`);
  console.log(`Total bag equipment with placeholder custom photos: ${bagEquipment.length}`);
  console.log(`Total equipment_photos with placeholder URLs: ${photos.length}`);
  console.log('\nThese placeholder images are likely causing the "non-photo photos" issue.');
  console.log('They should either be replaced with real images or set to null.');
}

findPlaceholderImages().catch(console.error);
