import dotenv from 'dotenv';
import { supabase } from './supabase-admin.js';

dotenv.config();

async function checkBagEquipment() {
  console.log('=== Checking bag_equipment table structure ===\n');
  
  // Check a sample bag equipment entry with custom_photo_url
  const { data: sampleWithPhoto, error: error1 } = await supabase
    .from('bag_equipment')
    .select('*')
    .not('custom_photo_url', 'is', null)
    .limit(1);
    
  if (error1) {
    console.error('Error fetching with photo:', error1);
  } else if (sampleWithPhoto && sampleWithPhoto.length > 0) {
    console.log('Sample bag_equipment with custom_photo_url:');
    console.log(sampleWithPhoto[0]);
  } else {
    console.log('No bag_equipment entries with custom_photo_url found');
  }
  
  // Check a sample without custom photo
  const { data: sampleWithoutPhoto, error: error2 } = await supabase
    .from('bag_equipment')
    .select('*')
    .is('custom_photo_url', null)
    .limit(1);
    
  if (!error2 && sampleWithoutPhoto && sampleWithoutPhoto.length > 0) {
    console.log('\nSample bag_equipment without custom_photo_url:');
    console.log(sampleWithoutPhoto[0]);
  }
  
  // Check how many have custom photos
  const { count: withPhotoCount } = await supabase
    .from('bag_equipment')
    .select('id', { count: 'exact', head: true })
    .not('custom_photo_url', 'is', null);
    
  const { count: totalCount } = await supabase
    .from('bag_equipment')
    .select('id', { count: 'exact', head: true });
    
  console.log(`\n=== Statistics ===`);
  console.log(`Total bag_equipment entries: ${totalCount}`);
  console.log(`Entries with custom_photo_url: ${withPhotoCount}`);
  console.log(`Percentage with custom photos: ${((withPhotoCount/totalCount) * 100).toFixed(1)}%`);
  
  // Test the query that bags.ts uses
  console.log('\n=== Testing bags.ts query pattern ===');
  const { data: testQuery, error: testError } = await supabase
    .from('bag_equipment')
    .select('*,equipment:equipment (*)')
    .not('custom_photo_url', 'is', null)
    .limit(1);
    
  if (testError) {
    console.error('Test query error:', testError);
  } else if (testQuery && testQuery.length > 0) {
    console.log('Query result has custom_photo_url:', !!testQuery[0].custom_photo_url);
    console.log('Custom photo URL:', testQuery[0].custom_photo_url);
  }
}

checkBagEquipment().catch(console.error);
