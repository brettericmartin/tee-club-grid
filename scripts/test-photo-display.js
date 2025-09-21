import dotenv from 'dotenv';
import { supabase } from './supabase-admin.js';

dotenv.config();

// Simplified version of getBestEquipmentPhoto for testing
function getBestEquipmentPhoto(equipment, customPhotoUrl) {
  // Check if a URL is a placeholder
  const isPlaceholder = (url) => {
    if (!url) return true;
    return url.toLowerCase().includes('placehold') || 
           url.toLowerCase().includes('placeholder');
  };
  
  // 1. Custom photo URL (highest priority)
  if (customPhotoUrl && !isPlaceholder(customPhotoUrl)) {
    return customPhotoUrl;
  }

  // 2. Most liked community photo
  if (equipment.equipment_photos && equipment.equipment_photos.length > 0) {
    const validPhotos = equipment.equipment_photos
      .filter(photo => photo.photo_url && !isPlaceholder(photo.photo_url))
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    
    if (validPhotos.length > 0) {
      return validPhotos[0].photo_url;
    }
  }

  // 3. Equipment's default image_url (if not placeholder)
  if (equipment.image_url && !isPlaceholder(equipment.image_url)) {
    return equipment.image_url;
  }

  return null;
}

async function testPhotoDisplay() {
  console.log('=== Testing Photo Display Consistency ===\n');
  
  // Test getUserBag function query
  const { data: bagData, error } = await supabase
    .from('user_bags')
    .select(`
      *,
      bag_equipment (
        *,
        equipment:equipment (
          *,
          equipment_photos (
            id,
            photo_url,
            likes_count,
            is_primary
          )
        )
      )
    `)
    .limit(1)
    .single();
    
  if (error) {
    console.error('Error fetching bag:', error);
    return;
  }
  
  console.log('Bag found:', bagData.name);
  console.log('Equipment count:', bagData.bag_equipment?.length || 0);
  
  // Test each equipment item
  let withCustomPhoto = 0;
  let withCommunityPhoto = 0;
  let withDefaultPhoto = 0;
  let withNoPhoto = 0;
  
  for (const item of bagData.bag_equipment || []) {
    if (item.equipment) {
      const bestPhoto = getBestEquipmentPhoto(item.equipment, item.custom_photo_url);
      
      console.log(`\n${item.equipment.brand} ${item.equipment.model}:`);
      console.log(`  Custom photo: ${item.custom_photo_url ? 'Yes' : 'No'}`);
      console.log(`  Community photos: ${item.equipment.equipment_photos?.length || 0}`);
      console.log(`  Default image: ${item.equipment.image_url ? 'Yes' : 'No'}`);
      console.log(`  Best photo selected: ${bestPhoto ? bestPhoto.substring(0, 50) + '...' : 'None'}`);
      
      if (item.custom_photo_url) {
        withCustomPhoto++;
      } else if (item.equipment.equipment_photos?.length > 0) {
        withCommunityPhoto++;
      } else if (item.equipment.image_url) {
        withDefaultPhoto++;
      } else {
        withNoPhoto++;
      }
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Equipment with custom photos: ${withCustomPhoto}`);
  console.log(`Equipment using community photos: ${withCommunityPhoto}`);
  console.log(`Equipment using default photos: ${withDefaultPhoto}`);
  console.log(`Equipment with no photos: ${withNoPhoto}`);
}

testPhotoDisplay().catch(console.error);