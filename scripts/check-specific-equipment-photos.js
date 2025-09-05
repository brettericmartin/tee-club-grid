import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificEquipment() {
  const equipmentId = 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba';
  
  console.log('=== CHECKING ODYSSEY HOCKEY STICK ===\n');
  console.log('Equipment ID:', equipmentId);
  
  // 1. Check equipment table
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();
    
  if (equipError) {
    console.error('Error fetching equipment:', equipError);
    return;
  }
  
  console.log('\nEquipment Details:');
  console.log('  Brand:', equipment.brand);
  console.log('  Model:', equipment.model);
  console.log('  Category:', equipment.category);
  console.log('  image_url:', equipment.image_url);
  
  // 2. Check equipment_photos table
  console.log('\n=== CHECKING EQUIPMENT_PHOTOS ===');
  
  const { data: photos, error: photosError } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId);
    
  if (photosError) {
    console.error('Error fetching photos:', photosError);
    return;
  }
  
  console.log(`\nFound ${photos.length} photos for this equipment:\n`);
  
  photos.forEach((photo, index) => {
    console.log(`Photo ${index + 1}:`);
    console.log('  ID:', photo.id);
    console.log('  URL:', photo.photo_url?.substring(0, 100) + '...');
    console.log('  Likes:', photo.likes_count || 0);
    console.log('  Is Primary:', photo.is_primary || false);
    console.log('  Created:', photo.created_at);
    console.log('');
  });
  
  // 3. Check bag_equipment with this equipment (to see custom photos)
  console.log('=== CHECKING BAG_EQUIPMENT CUSTOM PHOTOS ===');
  
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('id, custom_photo_url, bag_id')
    .eq('equipment_id', equipmentId)
    .not('custom_photo_url', 'is', null)
    .limit(5);
    
  if (!bagError && bagEquipment) {
    console.log(`\nFound ${bagEquipment.length} bag equipment entries with custom photos:\n`);
    
    bagEquipment.forEach((item, index) => {
      console.log(`Bag Equipment ${index + 1}:`);
      console.log('  ID:', item.id);
      console.log('  Bag ID:', item.bag_id);
      console.log('  Custom Photo:', item.custom_photo_url?.substring(0, 100) + '...');
      console.log('');
    });
  }
  
  // 4. Test the getEquipmentDetails query that the detail page uses
  console.log('=== TESTING getEquipmentDetails QUERY ===');
  
  const { data: detailData, error: detailError } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();
    
  if (!detailError) {
    console.log('\nBase equipment query successful');
    
    // Now test the photos query separately (like the service does)
    const { data: detailPhotos, error: detailPhotosError } = await supabase
      .from('equipment_photos')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('likes_count', { ascending: false });
      
    if (!detailPhotosError) {
      console.log(`Photos query returned ${detailPhotos?.length || 0} photos`);
    } else {
      console.error('Photos query error:', detailPhotosError);
    }
  }
}

checkSpecificEquipment().catch(console.error);