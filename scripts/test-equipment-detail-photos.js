import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEquipmentDetailPhotos() {
  const equipmentId = 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba'; // Odyssey Hockey Stick
  
  console.log('=== TESTING EQUIPMENT DETAIL PAGE QUERY ===\n');
  console.log('Testing the exact query used by EquipmentPhotoRepository component...\n');
  
  try {
    // Test the simplified query that we just fixed
    const { data, error } = await supabase
      .from('equipment_photos')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('likes_count', { ascending: false });
    
    if (error) {
      console.error('Query error:', error);
      return;
    }
    
    console.log('✅ Query successful!');
    console.log(`Found ${data.length} photos for Odyssey Hockey Stick\n`);
    
    data.forEach((photo, index) => {
      console.log(`Photo ${index + 1}:`);
      console.log('  ID:', photo.id);
      console.log('  URL:', photo.photo_url?.substring(0, 80) + '...');
      console.log('  Likes:', photo.likes_count || 0);
      console.log('');
    });
    
    console.log('The equipment detail page should now display these photos! 🎉');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testEquipmentDetailPhotos().catch(console.error);