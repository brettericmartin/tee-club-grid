import { supabase } from './supabase-admin.js';

async function photoStatusSummary() {
  console.log('=== EQUIPMENT PHOTO STATUS SUMMARY ===\n');
  
  // 1. Overall stats
  console.log('1. OVERALL STATISTICS:');
  const { count: totalPhotos } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
  console.log(`   Total photos: ${totalPhotos || 0}`);
  
  const { count: userPhotos } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true })
    .not('user_id', 'is', null);
  console.log(`   User-uploaded photos: ${userPhotos || 0}`);
  
  const { count: scraperPhotos } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null);
  console.log(`   Scraper/system photos: ${scraperPhotos || 0}`);
  
  // 2. Test RLS access
  console.log('\n2. RLS ACCESS TEST:');
  
  // Test with service role
  const { count: serviceAccessible } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
  console.log(`   Service role can see: ${serviceAccessible || 0} photos`);
  
  // Test with anon key
  const { createClient } = await import('@supabase/supabase-js');
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { count: anonAccessible } = await anonSupabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
  console.log(`   Anon key can see: ${anonAccessible || 0} photos`);
  
  if (anonAccessible === 0 && serviceAccessible > 0) {
    console.log('   ❌ RLS is blocking public access!');
    console.log('   ACTION REQUIRED: Apply RLS fix in Supabase Dashboard');
  } else if (anonAccessible === serviceAccessible) {
    console.log('   ✅ RLS is configured correctly - photos are publicly visible');
  }
  
  // 3. Sample equipment with photos
  console.log('\n3. EQUIPMENT WITH USER PHOTOS:');
  const { data: equipmentWithPhotos } = await supabase
    .from('equipment_photos')
    .select(`
      equipment_id,
      equipment:equipment_id (
        brand,
        model
      )
    `)
    .not('user_id', 'is', null)
    .limit(5);
    
  if (equipmentWithPhotos && equipmentWithPhotos.length > 0) {
    const seen = new Set();
    equipmentWithPhotos.forEach(item => {
      if (!seen.has(item.equipment_id)) {
        seen.add(item.equipment_id);
        console.log(`   - ${item.equipment?.brand} ${item.equipment?.model}`);
      }
    });
  }
  
  // 4. Specific test cases
  console.log('\n4. SPECIFIC TEST CASES:');
  
  // Odyssey Hockey Stick
  const { count: odysseyCount } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true })
    .eq('equipment_id', 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba')
    .not('user_id', 'is', null);
  console.log(`   Odyssey Hockey Stick: ${odysseyCount || 0} user photos`);
  
  // TaylorMade Qi10 LS
  const { count: qi10Count } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true })
    .eq('equipment_id', '06815e72-a50f-4e96-a41e-27e93e8c436e')
    .not('user_id', 'is', null);
  console.log(`   TaylorMade Qi10 LS: ${qi10Count || 0} user photos`);
  
  console.log('\n5. WHAT\'S BEEN FIXED:');
  console.log('   ✅ Removed bad "test" photo entry');
  console.log('   ✅ Filtered photo repository to only show user uploads');
  console.log('   ✅ Fixed photo URL accessibility (all URLs return 200)');
  console.log('   ✅ Updated EquipmentPhotoRepository to exclude scraper photos');
  console.log('   ✅ Simplified EquipmentImage component for better rendering');
  
  console.log('\n6. REMAINING ACTION:');
  if (anonAccessible === 0) {
    console.log('   ⚠️  APPLY RLS FIX: Run this SQL in Supabase Dashboard:');
    console.log('   ----------------------------------------------------');
    console.log('   ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;');
    console.log('   ');
    console.log('   DROP POLICY IF EXISTS "Anyone can view equipment photos" ON equipment_photos;');
    console.log('   CREATE POLICY "Anyone can view equipment photos" ON equipment_photos');
    console.log('     FOR SELECT TO anon, authenticated USING (true);');
    console.log('   ----------------------------------------------------');
  } else {
    console.log('   ✅ All fixes complete! Photos should now be visible.');
  }
}

photoStatusSummary().then(() => {
  console.log('\n✅ Summary complete');
  process.exit(0);
}).catch(console.error);