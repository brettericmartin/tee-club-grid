import { supabase } from './supabase-admin.js';

async function fixPhotoIssues() {
  console.log('=== FIXING EQUIPMENT PHOTO ISSUES ===\n');
  
  // 1. Find and remove bad entries
  console.log('1. Cleaning up bad photo entries...');
  
  // Remove test entry
  const { error: testError } = await supabase
    .from('equipment_photos')
    .delete()
    .eq('photo_url', 'test');
    
  if (!testError) {
    console.log('   ✅ Removed bad test entry');
  }
  
  // 2. Check for user uploads
  console.log('\n2. Checking for user-uploaded photos...');
  const { data: userPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .not('user_id', 'is', null);
    
  console.log(`   Found ${userPhotos?.length || 0} user-uploaded photos`);
  
  if (userPhotos && userPhotos.length > 0) {
    console.log('   Sample user uploads:');
    userPhotos.slice(0, 5).forEach(photo => {
      console.log(`   - Equipment: ${photo.equipment_id.substring(0, 8)}...`);
      console.log(`     URL: ${photo.photo_url?.substring(0, 50)}...`);
    });
  }
  
  // 3. Check for problematic generated photos
  console.log('\n3. Checking generated/scraper photos...');
  const { data: generatedPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .is('user_id', null)
    .like('photo_url', '%generated%');
    
  console.log(`   Found ${generatedPhotos?.length || 0} generated photos`);
  
  // 4. Check actual user photos for Odyssey Hockey Stick
  console.log('\n4. Checking Odyssey Hockey Stick photos...');
  const { data: odysseyPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba');
    
  console.log(`   Found ${odysseyPhotos?.length || 0} photos for Odyssey Hockey Stick`);
  odysseyPhotos?.forEach(photo => {
    console.log(`   - ID: ${photo.id}`);
    console.log(`     User: ${photo.user_id || 'NO USER (system/scraper)'}`)
    console.log(`     URL: ${photo.photo_url?.substring(0, 60)}...`);
    console.log(`     Source: ${photo.source}`);
  });
}

fixPhotoIssues().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(console.error);