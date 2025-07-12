import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipmentPhotos() {
  console.log('Checking equipment photos...\n');

  // Check if equipment_photos table exists and has data
  const { data: photos, error: photosError } = await supabase
    .from('equipment_photos')
    .select('*')
    .limit(10)
    .order('likes_count', { ascending: false });

  if (photosError) {
    console.error('Error fetching equipment photos:', photosError);
    return;
  }

  console.log(`Found ${photos?.length || 0} equipment photos`);
  if (photos && photos.length > 0) {
    console.log('\nSample photos:');
    photos.forEach(photo => {
      console.log({
        id: photo.id,
        equipment_id: photo.equipment_id,
        photo_url: photo.photo_url,
        likes_count: photo.likes_count,
        is_primary: photo.is_primary
      });
    });
  }

  // Check equipment with photos joined
  const { data: equipmentWithPhotos, error: joinError } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      image_url,
      equipment_photos (
        id,
        photo_url,
        likes_count,
        is_primary
      )
    `)
    .not('equipment_photos', 'is', null)
    .limit(5);

  if (!joinError && equipmentWithPhotos) {
    console.log('\nEquipment with photos:');
    equipmentWithPhotos.forEach(item => {
      console.log(`\n${item.brand} ${item.model}:`);
      console.log(`  Default image: ${item.image_url}`);
      console.log(`  User photos: ${item.equipment_photos.length}`);
      item.equipment_photos.forEach(photo => {
        console.log(`    - ${photo.photo_url} (${photo.likes_count} likes${photo.is_primary ? ', PRIMARY' : ''})`);
      });
    });
  }
}

checkEquipmentPhotos().catch(console.error);