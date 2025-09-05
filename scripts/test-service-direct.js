import { getEquipmentDetails } from '../src/services/equipment.ts';

async function testService() {
  console.log('Testing getEquipmentDetails for Odyssey Hockey Stick...\n');
  
  const equipmentId = 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba';
  
  try {
    const data = await getEquipmentDetails(equipmentId);
    
    console.log('Service returned:');
    console.log('================');
    console.log('Brand:', data.brand);
    console.log('Model:', data.model);
    console.log('image_url:', data.image_url || 'null');
    console.log('primaryPhoto:', data.primaryPhoto || 'null');
    console.log('most_liked_photo:', data.most_liked_photo || 'null');
    console.log('equipment_photos count:', data.equipment_photos?.length || 0);
    
    if (data.equipment_photos && data.equipment_photos.length > 0) {
      console.log('\nFirst photo in equipment_photos:');
      console.log('  URL:', data.equipment_photos[0].photo_url);
      console.log('  Is Primary:', data.equipment_photos[0].is_primary);
      console.log('  Likes:', data.equipment_photos[0].likes_count);
    }
    
    console.log('\n✅ Photo should display:', !!(data.primaryPhoto || data.most_liked_photo || data.image_url));
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testService();