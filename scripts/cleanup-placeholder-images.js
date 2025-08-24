import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Safety check - require explicit confirmation
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const cleanupPhotos = args.includes('--cleanup-photos');

if (!isDryRun && !args.includes('--confirm')) {
  console.error('\n⚠️  WARNING: This script will modify your database!');
  console.error('To execute changes, run with: --execute --confirm');
  console.error('To also remove placeholder equipment_photos, add: --cleanup-photos');
  console.error('To see what would be changed, run without flags (dry run).\n');
  process.exit(1);
}

async function cleanupPlaceholderImages() {
  console.log(`\n=== PLACEHOLDER IMAGE CLEANUP ${isDryRun ? '(DRY RUN)' : '(EXECUTING)'} ===\n`);
  
  const stats = {
    equipment: { total: 0, updated: 0, errors: 0 },
    bagEquipment: { total: 0, updated: 0, errors: 0 },
    equipmentPhotos: { total: 0, deleted: 0, errors: 0 }
  };

  // 1. Find and update equipment with placeholder images
  console.log('Step 1: Finding equipment with placeholder images...');
  
  const { data: equipmentWithPlaceholders, error: equipError } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .or('image_url.ilike.%placehold%,image_url.ilike.%placeholder%');
    
  if (equipError) {
    console.error('Error fetching equipment:', equipError);
    return;
  }
  
  stats.equipment.total = equipmentWithPlaceholders.length;
  console.log(`Found ${stats.equipment.total} equipment items with placeholder images`);
  
  if (!isDryRun && stats.equipment.total > 0) {
    console.log('\nUpdating equipment table...');
    
    for (const item of equipmentWithPlaceholders) {
      try {
        const { error } = await supabase
          .from('equipment')
          .update({ image_url: null })
          .eq('id', item.id);
          
        if (error) {
          console.error(`  ❌ Failed to update ${item.brand} ${item.model}:`, error.message);
          stats.equipment.errors++;
        } else {
          stats.equipment.updated++;
          if (stats.equipment.updated % 10 === 0) {
            console.log(`  ✓ Updated ${stats.equipment.updated}/${stats.equipment.total}`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Error updating ${item.brand} ${item.model}:`, err);
        stats.equipment.errors++;
      }
    }
    
    console.log(`  ✅ Updated ${stats.equipment.updated} equipment items`);
    if (stats.equipment.errors > 0) {
      console.log(`  ⚠️  ${stats.equipment.errors} errors occurred`);
    }
  }
  
  // 2. Find and update bag_equipment with placeholder custom photos
  console.log('\nStep 2: Finding bag_equipment with placeholder custom photos...');
  
  const { data: bagEquipmentWithPlaceholders, error: bagError } = await supabase
    .from('bag_equipment')
    .select('id, bag_id, equipment_id, custom_photo_url')
    .or('custom_photo_url.ilike.%placehold%,custom_photo_url.ilike.%placeholder%');
    
  if (bagError) {
    console.error('Error fetching bag_equipment:', bagError);
  } else {
    stats.bagEquipment.total = bagEquipmentWithPlaceholders.length;
    console.log(`Found ${stats.bagEquipment.total} bag_equipment items with placeholder custom photos`);
    
    if (!isDryRun && stats.bagEquipment.total > 0) {
      console.log('\nUpdating bag_equipment table...');
      
      for (const item of bagEquipmentWithPlaceholders) {
        try {
          const { error } = await supabase
            .from('bag_equipment')
            .update({ custom_photo_url: null })
            .eq('id', item.id);
            
          if (error) {
            console.error(`  ❌ Failed to update bag_equipment ${item.id}:`, error.message);
            stats.bagEquipment.errors++;
          } else {
            stats.bagEquipment.updated++;
            if (stats.bagEquipment.updated % 10 === 0) {
              console.log(`  ✓ Updated ${stats.bagEquipment.updated}/${stats.bagEquipment.total}`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Error updating bag_equipment ${item.id}:`, err);
          stats.bagEquipment.errors++;
        }
      }
      
      console.log(`  ✅ Updated ${stats.bagEquipment.updated} bag_equipment items`);
      if (stats.bagEquipment.errors > 0) {
        console.log(`  ⚠️  ${stats.bagEquipment.errors} errors occurred`);
      }
    }
  }
  
  // 3. Optionally remove placeholder entries from equipment_photos
  if (cleanupPhotos) {
    console.log('\nStep 3: Finding equipment_photos with placeholder URLs...');
    
    const { data: photosWithPlaceholders, error: photoError } = await supabase
      .from('equipment_photos')
      .select('id, equipment_id, photo_url')
      .or('photo_url.ilike.%placehold%,photo_url.ilike.%placeholder%');
      
    if (photoError) {
      console.error('Error fetching equipment_photos:', photoError);
    } else {
      stats.equipmentPhotos.total = photosWithPlaceholders.length;
      console.log(`Found ${stats.equipmentPhotos.total} equipment_photos with placeholder URLs`);
      
      if (!isDryRun && stats.equipmentPhotos.total > 0) {
        console.log('\n⚠️  WARNING: About to DELETE equipment_photos entries');
        console.log('These are likely not real user photos, but placeholder entries.');
        
        for (const photo of photosWithPlaceholders) {
          try {
            const { error } = await supabase
              .from('equipment_photos')
              .delete()
              .eq('id', photo.id);
              
            if (error) {
              console.error(`  ❌ Failed to delete photo ${photo.id}:`, error.message);
              stats.equipmentPhotos.errors++;
            } else {
              stats.equipmentPhotos.deleted++;
              if (stats.equipmentPhotos.deleted % 10 === 0) {
                console.log(`  ✓ Deleted ${stats.equipmentPhotos.deleted}/${stats.equipmentPhotos.total}`);
              }
            }
          } catch (err) {
            console.error(`  ❌ Error deleting photo ${photo.id}:`, err);
            stats.equipmentPhotos.errors++;
          }
        }
        
        console.log(`  ✅ Deleted ${stats.equipmentPhotos.deleted} placeholder photos`);
        if (stats.equipmentPhotos.errors > 0) {
          console.log(`  ⚠️  ${stats.equipmentPhotos.errors} errors occurred`);
        }
      }
    }
  }
  
  // 4. Generate summary report
  console.log('\n=== CLEANUP SUMMARY ===');
  console.log(`Equipment Table:`);
  console.log(`  - Found: ${stats.equipment.total} placeholder images`);
  if (!isDryRun) {
    console.log(`  - Updated: ${stats.equipment.updated}`);
    console.log(`  - Errors: ${stats.equipment.errors}`);
  }
  
  console.log(`\nBag Equipment Table:`);
  console.log(`  - Found: ${stats.bagEquipment.total} placeholder custom photos`);
  if (!isDryRun) {
    console.log(`  - Updated: ${stats.bagEquipment.updated}`);
    console.log(`  - Errors: ${stats.bagEquipment.errors}`);
  }
  
  if (cleanupPhotos) {
    console.log(`\nEquipment Photos Table:`);
    console.log(`  - Found: ${stats.equipmentPhotos.total} placeholder entries`);
    if (!isDryRun) {
      console.log(`  - Deleted: ${stats.equipmentPhotos.deleted}`);
      console.log(`  - Errors: ${stats.equipmentPhotos.errors}`);
    }
  }
  
  if (isDryRun) {
    console.log('\n📋 This was a DRY RUN - no changes were made.');
    console.log('To execute changes, run with: --execute --confirm');
    console.log('To also remove placeholder equipment_photos, add: --cleanup-photos');
  } else {
    console.log('\n✅ Cleanup completed successfully!');
    console.log('Placeholder images have been replaced with NULL values.');
    console.log('The frontend will now handle these properly.');
  }
  
  // 5. Verify cleanup (spot check)
  if (!isDryRun) {
    console.log('\n=== VERIFICATION ===');
    
    const { count: remainingEquipment } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .or('image_url.ilike.%placehold%,image_url.ilike.%placeholder%');
      
    const { count: remainingBagEquipment } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .or('custom_photo_url.ilike.%placehold%,custom_photo_url.ilike.%placeholder%');
      
    console.log(`Remaining placeholder images in equipment: ${remainingEquipment || 0}`);
    console.log(`Remaining placeholder custom photos in bag_equipment: ${remainingBagEquipment || 0}`);
    
    if (cleanupPhotos) {
      const { count: remainingPhotos } = await supabase
        .from('equipment_photos')
        .select('*', { count: 'exact', head: true })
        .or('photo_url.ilike.%placehold%,photo_url.ilike.%placeholder%');
        
      console.log(`Remaining placeholder URLs in equipment_photos: ${remainingPhotos || 0}`);
    }
  }
}

cleanupPlaceholderImages().catch(console.error);