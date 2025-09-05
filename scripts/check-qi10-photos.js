import { supabase } from './supabase-admin.js';

async function checkQi10Photos() {
  console.log('=== CHECKING TAYLORMADE QI10 LS PHOTOS ===\n');
  
  // Get the equipment ID for TaylorMade Qi10 LS
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .eq('brand', 'TaylorMade')
    .eq('model', 'Qi10 LS')
    .single();
    
  if (!equipment) {
    console.log('Equipment not found!');
    return;
  }
  
  console.log(`Equipment found: ${equipment.brand} ${equipment.model}`);
  console.log(`Equipment ID: ${equipment.id}\n`);
  
  // Check ALL photos for this equipment
  console.log('1. ALL photos for this equipment:');
  const { data: allPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipment.id);
    
  console.log(`   Total photos: ${allPhotos?.length || 0}`);
  if (allPhotos && allPhotos.length > 0) {
    allPhotos.forEach(photo => {
      console.log(`\n   Photo ID: ${photo.id}`);
      console.log(`   User ID: ${photo.user_id || 'NULL (scraper/system)'}`);
      console.log(`   URL: ${photo.photo_url}`);
      console.log(`   Source: ${photo.source}`);
      console.log(`   Is Primary: ${photo.is_primary}`);
      console.log(`   Created: ${photo.created_at}`);
    });
  }
  
  // Check user-uploaded photos only
  console.log('\n2. USER-UPLOADED photos only:');
  const { data: userPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipment.id)
    .not('user_id', 'is', null);
    
  console.log(`   User photos: ${userPhotos?.length || 0}`);
  
  // Check if there's a photo in bag_equipment
  console.log('\n3. Checking bag_equipment for custom photos:');
  const { data: bagEquipment } = await supabase
    .from('bag_equipment')
    .select('custom_photo, user_id')
    .eq('equipment_id', equipment.id)
    .not('custom_photo', 'is', null);
    
  console.log(`   Bags with custom photos: ${bagEquipment?.length || 0}`);
  if (bagEquipment && bagEquipment.length > 0) {
    bagEquipment.forEach(be => {
      console.log(`   - User: ${be.user_id}`);
      console.log(`     Photo: ${be.custom_photo}`);
    });
  }
  
  // Check what the equipment service would return
  console.log('\n4. What the equipment table has:');
  const { data: equipmentData } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      image_url,
      equipment_photos (
        id,
        photo_url,
        user_id,
        is_primary,
        likes_count
      )
    `)
    .eq('id', equipment.id)
    .single();
    
  console.log(`   Equipment image_url: ${equipmentData?.image_url || 'NULL'}`);
  console.log(`   Photos via join: ${equipmentData?.equipment_photos?.length || 0}`);
  
  // Test with anon key
  console.log('\n5. Testing with ANON key (what the app sees):');
  const { createClient } = await import('@supabase/supabase-js');
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { data: anonPhotos } = await anonSupabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipment.id);
    
  console.log(`   Anon key sees: ${anonPhotos?.length || 0} photos`);
  
  // If there's a discrepancy, check why
  if (anonPhotos?.length !== allPhotos?.length) {
    console.log('\n   ❌ RLS is blocking some photos!');
    console.log(`   Service role sees: ${allPhotos?.length || 0}`);
    console.log(`   Anon key sees: ${anonPhotos?.length || 0}`);
  }
}

checkQi10Photos().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(console.error);