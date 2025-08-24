import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Get equipment table structure
  const { data: columns, error } = await supabase.rpc('get_table_columns', {
    table_name: 'equipment'
  }).select('*');
  
  if (error) {
    // Try alternative approach
    const { data: sample, error: sampleError } = await supabase
      .from('equipment')
      .select('*')
      .limit(1);
      
    if (sample && sample.length > 0) {
      console.log('Equipment table columns:');
      Object.keys(sample[0]).forEach(col => {
        console.log(`  - ${col}: ${typeof sample[0][col]}`);
      });
      
      // Check for photo-related columns
      console.log('\nPhoto-related columns:');
      const photoColumns = Object.keys(sample[0]).filter(col => 
        col.includes('photo') || col.includes('image') || col.includes('url')
      );
      photoColumns.forEach(col => {
        console.log(`  - ${col}: "${sample[0][col]}"`);
      });
    }
  }
  
  // Check a specific equipment item with photos
  console.log('\n=== CHECKING SPECIFIC EQUIPMENT WITH PHOTOS ===');
  
  const { data: equipmentWithPhotos } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      image_url,
      category,
      equipment_photos!equipment_photos_equipment_id_fkey(
        id,
        photo_url,
        likes_count,
        created_at
      )
    `)
    .not('image_url', 'is', null)
    .limit(3);
    
  if (equipmentWithPhotos) {
    equipmentWithPhotos.forEach(item => {
      console.log(`\n${item.brand} ${item.model}`);
      console.log(`  Main image: ${item.image_url?.substring(0, 50)}...`);
      console.log(`  Community photos: ${item.equipment_photos?.length || 0}`);
      if (item.equipment_photos && item.equipment_photos.length > 0) {
        item.equipment_photos.slice(0, 3).forEach(photo => {
          console.log(`    - ${photo.photo_url?.substring(0, 50)}... (${photo.likes_count} likes)`);
        });
      }
    });
  }
}

checkSchema().catch(console.error);
