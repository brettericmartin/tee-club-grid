import dotenv from 'dotenv';
import { supabase } from './supabase-admin.js';

dotenv.config();

async function testEquipmentPhotos() {
  console.log('=== Testing Equipment Photos Association ===\n');
  
  // Get an equipment item that should have photos
  const { data: equipmentWithPhotos } = await supabase
    .from('equipment_photos')
    .select('equipment_id, photo_url, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent equipment photos uploaded:');
  for (const photo of equipmentWithPhotos || []) {
    console.log(`- Equipment: ${photo.equipment_id.substring(0,8)}...`);
    console.log(`  Photo: ${photo.photo_url.substring(0,60)}...`);
    console.log(`  Uploaded: ${photo.created_at}\n`);
  }
  
  // Now check if those equipment items are in anyone's bag
  if (equipmentWithPhotos && equipmentWithPhotos.length > 0) {
    const equipmentId = equipmentWithPhotos[0].equipment_id;
    
    console.log(`\nChecking if equipment ${equipmentId.substring(0,8)}... is in any bags:`);
    
    const { data: bagEntries } = await supabase
      .from('bag_equipment')
      .select('id, bag_id, custom_photo_url, equipment:equipment(brand, model)')
      .eq('equipment_id', equipmentId)
      .limit(5);
      
    if (bagEntries && bagEntries.length > 0) {
      console.log(`Found in ${bagEntries.length} bag(s):`);
      for (const entry of bagEntries) {
        console.log(`  - ${entry.equipment.brand} ${entry.equipment.model}`);
        console.log(`    Bag entry has custom_photo_url: ${entry.custom_photo_url ? 'Yes' : 'No'}`);
        if (entry.custom_photo_url) {
          console.log(`    URL: ${entry.custom_photo_url.substring(0,60)}...`);
        }
      }
    } else {
      console.log('This equipment is not in any bags');
    }
    
    // Check if the equipment itself has photos when queried properly
    console.log(`\nChecking equipment with photos relation:`);
    const { data: equipmentFull } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        image_url,
        equipment_photos (
          id,
          photo_url,
          likes_count
        )
      `)
      .eq('id', equipmentId)
      .single();
      
    if (equipmentFull) {
      console.log(`${equipmentFull.brand} ${equipmentFull.model}:`);
      console.log(`  Default image_url: ${equipmentFull.image_url ? 'Yes' : 'No'}`);
      console.log(`  Community photos: ${equipmentFull.equipment_photos?.length || 0}`);
      if (equipmentFull.equipment_photos && equipmentFull.equipment_photos.length > 0) {
        console.log('  Photo URLs:');
        for (const photo of equipmentFull.equipment_photos.slice(0, 3)) {
          console.log(`    - ${photo.photo_url.substring(0,60)}...`);
        }
      }
    }
  }
}

testEquipmentPhotos().catch(console.error);