import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findPlaceholderImages() {
  console.log('🔍 Finding placeholder images in equipment_photos table...\n');
  
  try {
    // First, let's see what placeholder images exist
    const { data: placeholders, error } = await supabase
      .from('equipment_photos')
      .select(`
        id,
        equipment_id,
        photo_url,
        user_id,
        source,
        created_at,
        equipment:equipment_id(brand, model)
      `)
      .or('photo_url.ilike.%placeholder%,photo_url.ilike.%placehold%,photo_url.ilike.%data:image%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Found ${placeholders?.length || 0} placeholder images\n`);

    // Group by user_id to identify system vs user placeholders
    const systemPlaceholders = placeholders?.filter(p => !p.user_id) || [];
    const userPlaceholders = placeholders?.filter(p => p.user_id) || [];

    console.log(`📊 Breakdown:`);
    console.log(`   - System placeholders (no user_id): ${systemPlaceholders.length}`);
    console.log(`   - User-uploaded placeholders: ${userPlaceholders.length}\n`);

    // Show sample of system placeholders
    if (systemPlaceholders.length > 0) {
      console.log('🗑️  System placeholders (safe to remove):');
      systemPlaceholders.slice(0, 5).forEach(p => {
        console.log(`   - ${p.equipment?.brand} ${p.equipment?.model}`);
        console.log(`     URL: ${p.photo_url.substring(0, 100)}...`);
        console.log(`     ID: ${p.id}`);
        console.log(`     Source: ${p.source || 'unknown'}`);
      });
      
      if (systemPlaceholders.length > 5) {
        console.log(`   ... and ${systemPlaceholders.length - 5} more\n`);
      }
    }

    // Check for Ping Glide 4.0 specifically
    const pingGlide = placeholders?.find(p => 
      p.equipment?.brand === 'Ping' && 
      p.equipment?.model?.includes('Glide 4.0')
    );

    if (pingGlide) {
      console.log('\n🎯 Found Ping Glide 4.0 placeholder:');
      console.log(`   Equipment ID: ${pingGlide.equipment_id}`);
      console.log(`   Photo ID: ${pingGlide.id}`);
      console.log(`   URL: ${pingGlide.photo_url.substring(0, 100)}...`);
      console.log(`   User ID: ${pingGlide.user_id || 'none (system)'}`);
    }

    // Check if any bag_equipment references these placeholders
    const placeholderIds = systemPlaceholders.map(p => p.id);
    if (placeholderIds.length > 0) {
      const { data: references, error: refError } = await supabase
        .from('bag_equipment')
        .select('id, selected_photo_id')
        .in('selected_photo_id', placeholderIds);

      if (!refError && references?.length) {
        console.log(`\n⚠️  WARNING: ${references.length} bag_equipment entries reference system placeholders`);
        console.log('These references will be cleared when placeholders are removed.');
      }
    }

    return { systemPlaceholders, userPlaceholders };
  } catch (error) {
    console.error('Error finding placeholders:', error);
    return { systemPlaceholders: [], userPlaceholders: [] };
  }
}

async function removePlaceholders(dryRun = true) {
  const { systemPlaceholders } = await findPlaceholderImages();
  
  if (systemPlaceholders.length === 0) {
    console.log('\n✅ No system placeholders to remove!');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made');
    console.log(`Would remove ${systemPlaceholders.length} system placeholder images`);
    console.log('\nTo actually remove them, run: npm run clean-placeholders:execute');
    return;
  }

  console.log(`\n🗑️  Removing ${systemPlaceholders.length} system placeholder images...`);
  
  // First, clear any references in bag_equipment
  const placeholderIds = systemPlaceholders.map(p => p.id);
  
  const { error: updateError } = await supabase
    .from('bag_equipment')
    .update({ selected_photo_id: null })
    .in('selected_photo_id', placeholderIds);

  if (updateError) {
    console.error('Error clearing bag_equipment references:', updateError);
    return;
  }

  // Now delete the placeholder images
  const { error: deleteError } = await supabase
    .from('equipment_photos')
    .delete()
    .in('id', placeholderIds)
    .is('user_id', null); // Extra safety: only delete if no user_id

  if (deleteError) {
    console.error('Error deleting placeholders:', deleteError);
    return;
  }

  console.log('✅ Successfully removed system placeholder images!');
  
  // Show what equipment might need new photos
  const affectedEquipment = [...new Set(systemPlaceholders.map(p => 
    `${p.equipment?.brand} ${p.equipment?.model}`
  ))];
  
  console.log('\n📸 Equipment that may need new photos:');
  affectedEquipment.slice(0, 10).forEach(eq => {
    console.log(`   - ${eq}`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const isExecute = args.includes('--execute');

console.log('🧹 Placeholder Image Cleanup Tool\n');
console.log('This tool will help identify and remove placeholder images.\n');

if (isExecute) {
  console.log('⚠️  EXECUTE MODE - Changes WILL be made to the database!\n');
  console.log('Proceeding in 3 seconds... Press Ctrl+C to cancel.\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  removePlaceholders(false);
} else {
  removePlaceholders(true);
}