import { supabase } from './supabase-admin.js';

async function checkEquipmentPhotos() {
  console.log('=== CHECKING EQUIPMENT_PHOTOS TABLE ===\n');
  
  // Get a sample of equipment photos
  const { data: photos, error: photosError } = await supabase
    .from('equipment_photos')
    .select('*')
    .limit(20)
    .order('created_at', { ascending: false });
    
  if (photosError) {
    console.error('Error fetching equipment_photos:', photosError);
    return;
  }
  
  console.log(`Found ${photos.length} recent equipment photos\n`);
  
  // Analyze photo URLs
  const urlPatterns = {
    valid_supabase: [],
    valid_cloudinary: [],
    data_uri: [],
    null_or_empty: [],
    suspicious: []
  };
  
  photos.forEach(photo => {
    const url = photo.photo_url;
    
    if (!url || url === 'null' || url === 'undefined' || url === '') {
      urlPatterns.null_or_empty.push({
        id: photo.id,
        equipment_id: photo.equipment_id,
        url: url,
        created_at: photo.created_at
      });
    } else if (url.includes('supabase')) {
      urlPatterns.valid_supabase.push({
        id: photo.id,
        equipment_id: photo.equipment_id,
        url: url.substring(0, 100) + '...'
      });
    } else if (url.includes('cloudinary')) {
      urlPatterns.valid_cloudinary.push({
        id: photo.id,
        equipment_id: photo.equipment_id,
        url: url.substring(0, 100) + '...'
      });
    } else if (url.startsWith('data:')) {
      urlPatterns.data_uri.push({
        id: photo.id,
        equipment_id: photo.equipment_id,
        url: 'data:image (base64)'
      });
    } else {
      urlPatterns.suspicious.push({
        id: photo.id,
        equipment_id: photo.equipment_id,
        url: url,
        created_at: photo.created_at
      });
    }
  });
  
  console.log('=== URL PATTERN ANALYSIS ===');
  console.log(`Valid Supabase URLs: ${urlPatterns.valid_supabase.length}`);
  console.log(`Valid Cloudinary URLs: ${urlPatterns.valid_cloudinary.length}`);
  console.log(`Data URI images: ${urlPatterns.data_uri.length}`);
  console.log(`Null/Empty URLs: ${urlPatterns.null_or_empty.length}`);
  console.log(`Suspicious URLs: ${urlPatterns.suspicious.length}`);
  
  if (urlPatterns.null_or_empty.length > 0) {
    console.log('\n=== NULL/EMPTY PHOTO URLS (PROBLEMATIC) ===');
    urlPatterns.null_or_empty.forEach(photo => {
      console.log(`ID: ${photo.id}`);
      console.log(`  Equipment ID: ${photo.equipment_id}`);
      console.log(`  URL: "${photo.url}"`);
      console.log(`  Created: ${photo.created_at}`);
    });
  }
  
  if (urlPatterns.suspicious.length > 0) {
    console.log('\n=== SUSPICIOUS PHOTO URLS ===');
    urlPatterns.suspicious.forEach(photo => {
      console.log(`ID: ${photo.id}`);
      console.log(`  Equipment ID: ${photo.equipment_id}`);
      console.log(`  URL: ${photo.url}`);
      console.log(`  Created: ${photo.created_at}`);
    });
  }
  
  // Check equipment table for problematic image_url or most_liked_photo
  console.log('\n=== CHECKING EQUIPMENT TABLE FOR PROBLEMATIC PHOTOS ===\n');
  
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url, most_liked_photo')
    .or('image_url.is.null,image_url.eq.,most_liked_photo.is.null,most_liked_photo.eq.')
    .limit(20);
    
  if (equipError) {
    console.error('Error fetching equipment:', equipError);
  } else if (equipment && equipment.length > 0) {
    console.log(`Found ${equipment.length} equipment items with null/empty photos:`);
    equipment.forEach(item => {
      console.log(`\n${item.brand} ${item.model} (ID: ${item.id})`);
      console.log(`  image_url: "${item.image_url}"`);
      console.log(`  most_liked_photo: "${item.most_liked_photo}"`);
    });
  } else {
    console.log('No equipment found with null/empty photos');
  }
  
  // Check bag_equipment for custom_photo_url issues
  console.log('\n=== CHECKING BAG_EQUIPMENT CUSTOM PHOTOS ===\n');
  
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('id, bag_id, equipment_id, custom_photo_url')
    .not('custom_photo_url', 'is', null)
    .limit(20);
    
  if (bagError) {
    console.error('Error fetching bag_equipment:', bagError);
  } else if (bagEquipment && bagEquipment.length > 0) {
    console.log(`Found ${bagEquipment.length} bag equipment items with custom photos`);
    
    const customPhotoPatterns = {
      valid: 0,
      suspicious: []
    };
    
    bagEquipment.forEach(item => {
      const url = item.custom_photo_url;
      if (!url || url === 'null' || url === 'undefined' || url === '' || 
          (!url.includes('supabase') && !url.includes('cloudinary') && !url.startsWith('data:'))) {
        customPhotoPatterns.suspicious.push({
          id: item.id,
          bag_id: item.bag_id,
          equipment_id: item.equipment_id,
          url: url
        });
      } else {
        customPhotoPatterns.valid++;
      }
    });
    
    console.log(`\nValid custom photos: ${customPhotoPatterns.valid}`);
    if (customPhotoPatterns.suspicious.length > 0) {
      console.log(`Suspicious custom photos: ${customPhotoPatterns.suspicious.length}`);
      customPhotoPatterns.suspicious.forEach(item => {
        console.log(`  Bag equipment ID: ${item.id}`);
        console.log(`    URL: "${item.url}"`);
      });
    }
  } else {
    console.log('No bag equipment found with custom photos');
  }
  
  // Check for Odyssey equipment specifically
  console.log('\n=== CHECKING ODYSSEY EQUIPMENT ===\n');
  
  const { data: odysseyEquipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('brand', 'Odyssey')
    .limit(10);
    
  if (odysseyEquipment && odysseyEquipment.length > 0) {
    console.log(`Found ${odysseyEquipment.length} Odyssey equipment items:\n`);
    
    for (const item of odysseyEquipment) {
      console.log(`${item.brand} ${item.model}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Category: ${item.category}`);
      console.log(`  Image URL: ${item.image_url ? 'Yes' : 'No'}`);
      console.log(`  Most Liked Photo: ${item.most_liked_photo ? 'Yes' : 'No'}`);
      
      // Check for photos in equipment_photos table
      const { data: photos } = await supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', item.id);
        
      console.log(`  Equipment Photos: ${photos?.length || 0}`);
      if (photos && photos.length > 0) {
        photos.forEach(p => {
          console.log(`    - ${p.photo_url?.substring(0, 60)}... ${p.is_primary ? '(PRIMARY)' : ''}`);
        });
      }
      console.log('');
    }
  } else {
    console.log('No Odyssey equipment found');
  }
}

checkEquipmentPhotos().catch(console.error);
