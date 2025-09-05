import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

async function testPhotoUrls() {
  console.log('=== TESTING EQUIPMENT PHOTO URLS ===\n');
  
  // 1. Get some sample photos
  console.log('1. Fetching user-uploaded photos...');
  const { data: photos, error } = await supabase
    .from('equipment_photos')
    .select('*')
    .not('user_id', 'is', null)
    .limit(5);
    
  if (error) {
    console.error('Error fetching photos:', error);
    return;
  }
  
  console.log(`\nFound ${photos?.length || 0} user photos to test\n`);
  
  if (!photos || photos.length === 0) {
    console.log('No photos found to test');
    return;
  }
  
  // 2. Test each photo URL
  for (const photo of photos) {
    console.log(`\nTesting photo ID: ${photo.id}`);
    console.log(`Equipment: ${photo.equipment_id?.substring(0, 8)}...`);
    console.log(`Original URL: ${photo.photo_url}`);
    
    // Test the URL directly
    try {
      const response = await fetch(photo.photo_url);
      console.log(`  Direct fetch status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        console.log('  ✅ URL is accessible');
      } else {
        console.log('  ❌ URL returned error');
      }
    } catch (fetchError) {
      console.log('  ❌ Failed to fetch:', fetchError.message);
    }
    
    // Check if it needs the public path fix
    if (photo.photo_url?.includes('supabase.co/storage')) {
      if (!photo.photo_url.includes('/public/')) {
        const fixedUrl = photo.photo_url.replace('/storage/v1/object/', '/storage/v1/object/public/');
        console.log(`  Fixed URL: ${fixedUrl}`);
        
        try {
          const response = await fetch(fixedUrl);
          console.log(`  Fixed URL status: ${response.status} ${response.statusText}`);
          
          if (response.status === 200) {
            console.log('  ✅ Fixed URL works! Updating database...');
            
            // Update the photo URL in the database
            const { error: updateError } = await supabase
              .from('equipment_photos')
              .update({ photo_url: fixedUrl })
              .eq('id', photo.id);
              
            if (!updateError) {
              console.log('  ✅ Database updated');
            } else {
              console.log('  ❌ Failed to update database:', updateError.message);
            }
          }
        } catch (e) {
          console.log('  ❌ Fixed URL also failed:', e.message);
        }
      }
    }
  }
  
  console.log('\n=== TESTING SPECIFIC EQUIPMENT (Odyssey Hockey Stick) ===\n');
  
  const { data: odysseyPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba')
    .not('user_id', 'is', null);
    
  console.log(`Found ${odysseyPhotos?.length || 0} user photos for Odyssey Hockey Stick`);
  
  if (odysseyPhotos && odysseyPhotos.length > 0) {
    for (const photo of odysseyPhotos) {
      console.log(`\nPhoto ID: ${photo.id}`);
      console.log(`URL: ${photo.photo_url}`);
      console.log(`User ID: ${photo.user_id}`);
      
      // Test accessibility
      try {
        const response = await fetch(photo.photo_url);
        console.log(`Status: ${response.status} - ${response.status === 200 ? '✅ Accessible' : '❌ Not accessible'}`);
      } catch (e) {
        console.log(`Status: ❌ Fetch error - ${e.message}`);
      }
    }
  }
}

testPhotoUrls().then(() => {
  console.log('\n✅ Done testing');
  process.exit(0);
}).catch(console.error);