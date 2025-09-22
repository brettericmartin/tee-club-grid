import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function debugEquipmentPhotos() {
  const equipmentId = 'c5e025d0-e76b-4c08-b952-bebc9fcdd98c';

  console.log('=== Debugging Equipment Photos ===');
  console.log('Equipment ID:', equipmentId);
  console.log('');

  // 1. Check if equipment exists
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (equipmentError) {
    console.error('Error fetching equipment:', equipmentError);
    return;
  }

  console.log('Equipment found:', {
    brand: equipment.brand,
    model: equipment.model,
    category: equipment.category,
    image_url: equipment.image_url
  });
  console.log('');

  // 2. Check equipment_photos table directly
  console.log('=== Checking equipment_photos table ===');
  const { data: photos, error: photosError } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId);

  if (photosError) {
    console.error('Error fetching photos:', photosError);
  } else {
    console.log('Photos found in equipment_photos:', photos?.length || 0);
    if (photos && photos.length > 0) {
      photos.forEach((photo, i) => {
        console.log(`Photo ${i + 1}:`, {
          id: photo.id,
          url: photo.photo_url,
          user_id: photo.user_id,
          likes: photo.likes_count,
          created: photo.created_at
        });
      });
    }
  }
  console.log('');

  // 3. Check bag_equipment for this equipment
  console.log('=== Checking bag_equipment for photos ===');
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('*')
    .eq('equipment_id', equipmentId);

  if (bagError) {
    console.error('Error fetching bag equipment:', bagError);
  } else {
    console.log('Bag equipment entries found:', bagEquipment?.length || 0);
    if (bagEquipment && bagEquipment.length > 0) {
      bagEquipment.forEach((item, i) => {
        console.log(`Entry ${i + 1}:`, {
          id: item.id,
          bag_id: item.bag_id,
          custom_photo_url: item.custom_photo_url,
          selected_photo_id: item.selected_photo_id,
          created: item.created_at
        });
      });
    }
  }
  console.log('');

  // 4. Check if there are ANY photos in equipment_photos for similar equipment
  console.log('=== Checking for similar equipment ===');
  const { data: similarEquipment } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .eq('brand', equipment.brand)
    .eq('model', equipment.model);

  if (similarEquipment && similarEquipment.length > 1) {
    console.log('Found similar equipment entries:', similarEquipment.length);

    for (const eq of similarEquipment) {
      const { data: otherPhotos } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('equipment_id', eq.id);

      if (otherPhotos && otherPhotos.length > 0) {
        console.log(`Equipment ${eq.id} has ${otherPhotos.length} photos`);
      }
    }
  }
  console.log('');

  // 5. Check ALL photos in equipment_photos table
  console.log('=== Checking total photos in database ===');
  const { count: totalPhotos } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });

  console.log('Total photos in equipment_photos table:', totalPhotos);

  // 6. Check if photos are stored in bag_equipment custom_photo_url instead
  if (bagEquipment && bagEquipment.length > 0) {
    const photosInBagEquipment = bagEquipment.filter(item => item.custom_photo_url);
    console.log('Photos stored in bag_equipment.custom_photo_url:', photosInBagEquipment.length);

    if (photosInBagEquipment.length > 0) {
      console.log('');
      console.log('⚠️  ISSUE FOUND: Photos are stored in bag_equipment.custom_photo_url');
      console.log('   but NOT in equipment_photos table!');
      console.log('   This is why equipment detail pages show no photos.');
      console.log('');
      console.log('Photos that should be migrated:');
      photosInBagEquipment.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.custom_photo_url}`);
      });
    }
  }
}

debugEquipmentPhotos().catch(console.error);