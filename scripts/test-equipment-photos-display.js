import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEquipmentPhotosDisplay() {
  console.log('=== TESTING EQUIPMENT PHOTOS DISPLAY ===\n');
  
  // Test the same query that getEquipment uses
  console.log('Testing equipment query with photos join...');
  
  const { data, error } = await supabase
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
    
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`\nFetched ${data.length} equipment items\n`);
  
  // Analyze the results
  data.forEach((equipment, index) => {
    console.log(`${index + 1}. ${equipment.brand} ${equipment.model}`);
    console.log(`   - Category: ${equipment.category}`);
    console.log(`   - Base image_url: ${equipment.image_url ? 'Present' : 'Missing'}`);
    console.log(`   - Equipment photos: ${equipment.equipment_photos?.length || 0} photos`);
    
    if (equipment.equipment_photos && equipment.equipment_photos.length > 0) {
      // Get most liked photo
      const sortedPhotos = [...equipment.equipment_photos].sort((a, b) => 
        (b.likes_count || 0) - (a.likes_count || 0)
      );
      
      console.log(`   - Most liked photo:`);
      console.log(`     URL: ${sortedPhotos[0].photo_url.substring(0, 80)}...`);
      console.log(`     Likes: ${sortedPhotos[0].likes_count || 0}`);
    }
    
    console.log('');
  });
  
  // Test equipment with the most photos
  console.log('=== EQUIPMENT WITH MOST PHOTOS ===\n');
  
  const { data: topPhotos, error: topError } = await supabase
    .from('equipment_photos')
    .select('equipment_id')
    .limit(100);
    
  if (!topError && topPhotos) {
    // Count photos per equipment
    const photoCounts = {};
    topPhotos.forEach(photo => {
      photoCounts[photo.equipment_id] = (photoCounts[photo.equipment_id] || 0) + 1;
    });
    
    // Get top 3
    const topEquipmentIds = Object.entries(photoCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    
    for (const equipId of topEquipmentIds) {
      const { data: equip } = await supabase
        .from('equipment')
        .select(`
          *,
          equipment_photos (
            id,
            photo_url,
            likes_count
          )
        `)
        .eq('id', equipId)
        .single();
        
      if (equip) {
        console.log(`${equip.brand} ${equip.model}: ${equip.equipment_photos.length} photos`);
      }
    }
  }
}

testEquipmentPhotosDisplay().catch(console.error);