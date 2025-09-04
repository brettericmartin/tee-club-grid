import { supabase } from './supabase-admin.js';

async function migrateBagPhotosToEquipment() {
  console.log('=== MIGRATING BAG CUSTOM PHOTOS TO EQUIPMENT_PHOTOS TABLE ===\n');
  
  // 1. Find all bag_equipment entries with custom photos
  console.log('1. Finding all custom photos in bag_equipment...');
  const { data: bagEquipment, error: fetchError } = await supabase
    .from('bag_equipment')
    .select(`
      id,
      equipment_id,
      custom_photo_url,
      bag_id,
      user_bags!inner (
        user_id
      )
    `)
    .not('custom_photo_url', 'is', null);
    
  if (fetchError) {
    console.error('Error fetching bag equipment:', fetchError);
    return;
  }
  
  console.log(`   Found ${bagEquipment?.length || 0} custom photos in bags\n`);
  
  if (!bagEquipment || bagEquipment.length === 0) {
    console.log('No custom photos to migrate');
    return;
  }
  
  // 2. Check which photos already exist in equipment_photos
  console.log('2. Checking for existing entries in equipment_photos...');
  const photoUrls = bagEquipment.map(be => be.custom_photo_url);
  
  const { data: existingPhotos } = await supabase
    .from('equipment_photos')
    .select('photo_url')
    .in('photo_url', photoUrls);
    
  const existingUrls = new Set(existingPhotos?.map(p => p.photo_url) || []);
  console.log(`   Found ${existingUrls.size} photos already in equipment_photos\n`);
  
  // 3. Prepare photos to migrate
  const photosToMigrate = bagEquipment.filter(be => 
    !existingUrls.has(be.custom_photo_url)
  );
  
  console.log(`3. Migrating ${photosToMigrate.length} new photos...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const bagItem of photosToMigrate) {
    const userId = bagItem.user_bags.user_id;
    
    console.log(`   Migrating photo for equipment ${bagItem.equipment_id.substring(0, 8)}...`);
    console.log(`     User: ${userId.substring(0, 8)}...`);
    console.log(`     URL: ${bagItem.custom_photo_url.substring(0, 60)}...`);
    
    const { error: insertError } = await supabase
      .from('equipment_photos')
      .insert({
        equipment_id: bagItem.equipment_id,
        user_id: userId,
        photo_url: bagItem.custom_photo_url,
        is_primary: false,
        likes_count: 0,
        source: 'community',
        caption: 'Custom photo from user bag',
        metadata: {
          migrated_from: 'bag_equipment',
          bag_id: bagItem.bag_id,
          migrated_at: new Date().toISOString()
        }
      });
      
    if (insertError) {
      console.error(`     ❌ Error: ${insertError.message}`);
      errorCount++;
    } else {
      console.log(`     ✅ Success`);
      successCount++;
    }
  }
  
  // 4. Summary
  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Total custom photos found: ${bagEquipment.length}`);
  console.log(`Already existed: ${existingUrls.size}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  
  // 5. Verify specific equipment (like TaylorMade Qi10 LS)
  console.log('\n=== VERIFICATION ===');
  const { data: qi10Photos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', 'b7e7f6bf-72e9-45e6-8bac-21a40bce0082')
    .not('user_id', 'is', null);
    
  console.log(`TaylorMade Qi10 LS now has ${qi10Photos?.length || 0} user photos`);
}

migrateBagPhotosToEquipment().then(() => {
  console.log('\n✅ Migration complete');
  process.exit(0);
}).catch(console.error);