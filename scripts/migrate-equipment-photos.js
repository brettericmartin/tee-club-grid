import { supabase } from './supabase-admin.js';

async function migrateEquipmentPhotos() {
  console.log('=== MIGRATING EQUIPMENT PHOTOS ===\n');
  
  // Get all equipment with image_url but no photos
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .not('image_url', 'is', null)
    .order('brand');
    
  if (!equipment || equipment.length === 0) {
    console.log('No equipment with image_url found');
    return;
  }
  
  console.log(`Found ${equipment.length} equipment items with image_url`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const item of equipment) {
    // Check if this equipment already has photos
    const { data: existingPhotos } = await supabase
      .from('equipment_photos')
      .select('id')
      .eq('equipment_id', item.id)
      .limit(1);
      
    if (existingPhotos && existingPhotos.length > 0) {
      skipped++;
      console.log(`⏭️  Skipping ${item.brand} ${item.model} - already has photos`);
      continue;
    }
    
    // Add the image_url as an equipment_photo
    const { error } = await supabase
      .from('equipment_photos')
      .insert({
        equipment_id: item.id,
        photo_url: item.image_url,
        is_primary: true,
        likes_count: 0,
        source: 'community' // Use a valid source value
      });
      
    if (error) {
      errors++;
      console.error(`❌ Error migrating ${item.brand} ${item.model}:`, error.message);
    } else {
      migrated++;
      console.log(`✅ Migrated ${item.brand} ${item.model}`);
    }
  }
  
  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${equipment.length}`);
}

migrateEquipmentPhotos().then(() => process.exit(0)).catch(console.error);