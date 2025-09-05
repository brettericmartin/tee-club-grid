import { supabase } from './supabase-admin.js';

async function testPhotoLogic() {
  // Simulate the getEquipment query for Odyssey
  const { data } = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_photos (
        id,
        photo_url,
        likes_count,
        is_primary
      )
    `)
    .eq('id', 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba')
    .single();
    
  if (data) {
    // Apply our new photo logic
    const photos = data.equipment_photos || [];
    const primaryMarkedPhoto = photos.find(p => p.is_primary)?.photo_url;
    const mostLikedPhoto = photos.length > 0 
      ? photos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0].photo_url
      : null;
    const anyPhoto = photos.length > 0 ? photos[0].photo_url : null;
    const bestPhoto = primaryMarkedPhoto || mostLikedPhoto || anyPhoto || data.image_url;
    
    console.log('Odyssey Hockey Stick Photo Resolution:');
    console.log('=====================================');
    console.log('Equipment ID:', data.id);
    console.log('Brand:', data.brand);
    console.log('Model:', data.model);
    console.log('Has image_url:', !!data.image_url);
    console.log('Photos in equipment_photos:', photos.length);
    console.log('Primary marked photo:', !!primaryMarkedPhoto);
    console.log('Most liked photo:', !!mostLikedPhoto);
    console.log('Any photo:', !!anyPhoto);
    console.log('Best photo selected:', bestPhoto ? bestPhoto.substring(0, 60) + '...' : 'NONE');
    console.log('');
    console.log('Result: primaryPhoto will be:', bestPhoto ? 'SET ✅' : 'MISSING ❌');
    console.log('Result: most_liked_photo will be:', (mostLikedPhoto || anyPhoto) ? 'SET ✅' : 'MISSING ❌');
    
    if (bestPhoto) {
      console.log('\nFull photo URL:', bestPhoto);
    }
  } else {
    console.log('Equipment not found');
  }
  
  // Also test a few more equipment items with photos
  console.log('\n\n=== Testing Other Equipment with Photos ===\n');
  const { data: equipmentWithPhotos } = await supabase
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
    
  for (const eq of equipmentWithPhotos || []) {
    const photos = eq.equipment_photos || [];
    if (photos.length === 0) continue;
    
    const primaryMarkedPhoto = photos.find(p => p.is_primary)?.photo_url;
    const mostLikedPhoto = photos.length > 0 
      ? photos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0].photo_url
      : null;
    const anyPhoto = photos.length > 0 ? photos[0].photo_url : null;
    const bestPhoto = primaryMarkedPhoto || mostLikedPhoto || anyPhoto || eq.image_url;
    
    console.log(`${eq.brand} ${eq.model}:`);
    console.log(`  - Has image_url: ${!!eq.image_url}`);
    console.log(`  - Photos: ${photos.length}`);
    console.log(`  - Best photo: ${bestPhoto ? 'SET ✅' : 'MISSING ❌'}`);
  }
  
  process.exit(0);
}

testPhotoLogic().catch(console.error);