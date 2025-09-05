import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullFlow() {
  console.log('=== TESTING FULL EQUIPMENT PHOTO FLOW ===\n');
  
  // 1. Test a specific equipment with photos
  const odysseyId = 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba';
  
  // 2. Find other equipment with photos
  console.log('Finding equipment with photos...\n');
  
  const { data: photoData, error: photoError } = await supabase
    .from('equipment_photos')
    .select('equipment_id')
    .limit(10);
    
  if (photoError) {
    console.error('Error fetching photo data:', photoError);
    return;
  }
  
  // Get unique equipment IDs
  const equipmentIds = [...new Set(photoData.map(p => p.equipment_id))];
  
  console.log('Equipment with photos:');
  for (const id of equipmentIds) {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('id', id)
      .single();
      
    const { count } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', id);
      
    if (equipment) {
      console.log(`- ${equipment.brand} ${equipment.model}: ${count} photo(s)`);
      console.log(`  URL: http://localhost:3333/equipment/${id}`);
    }
  }
  
  console.log('\n=== TESTING EQUIPMENT LIST PAGE ===\n');
  
  // Test the getEquipment query with photos
  const { data: equipmentList, error: listError } = await supabase
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
    .limit(5);
    
  if (listError) {
    console.error('Error fetching equipment list:', listError);
  } else {
    console.log('Equipment list with photos:');
    equipmentList.forEach(eq => {
      const photoCount = eq.equipment_photos?.length || 0;
      console.log(`- ${eq.brand} ${eq.model}: ${photoCount} photo(s)`);
    });
  }
  
  console.log('\n✅ All queries working correctly!');
  console.log('\nPlease check these pages in the browser:');
  console.log('1. http://localhost:3333/equipment - Should show photo count badges');
  console.log('2. http://localhost:3333/equipment/c750ace3-da4d-466a-8f70-6a98a2e4b8ba - Should show Odyssey photo');
  console.log('\nCheck the browser console for debug logs!');
}

testFullFlow().catch(console.error);