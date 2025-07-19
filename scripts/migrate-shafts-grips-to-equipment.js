import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateShaftsAndGrips() {
  console.log('🔧 Starting shaft and grip migration to equipment items...\n');

  try {
    // 1. Get unique shafts from the shafts table
    console.log('📊 Fetching unique shafts...');
    const { data: shafts, error: shaftError } = await supabase
      .from('shafts')
      .select('brand, model, category')
      .order('brand', { ascending: true });

    if (shaftError) {
      console.error('Error fetching shafts:', shaftError);
      return;
    }

    // Group shafts by brand and model to get unique combinations
    const uniqueShafts = {};
    shafts?.forEach(shaft => {
      const key = `${shaft.brand}|${shaft.model}`;
      if (!uniqueShafts[key]) {
        uniqueShafts[key] = {
          brand: shaft.brand,
          model: shaft.model,
          category: 'shaft'
        };
      }
    });

    console.log(`Found ${Object.keys(uniqueShafts).length} unique shafts`);

    // 2. Get unique grips from the grips table
    console.log('\n📊 Fetching unique grips...');
    const { data: grips, error: gripError } = await supabase
      .from('grips')
      .select('brand, model')
      .order('brand', { ascending: true });

    if (gripError) {
      console.error('Error fetching grips:', gripError);
      return;
    }

    // Group grips by brand and model to get unique combinations
    const uniqueGrips = {};
    grips?.forEach(grip => {
      const key = `${grip.brand}|${grip.model}`;
      if (!uniqueGrips[key]) {
        uniqueGrips[key] = {
          brand: grip.brand,
          model: grip.model,
          category: 'grip'
        };
      }
    });

    console.log(`Found ${Object.keys(uniqueGrips).length} unique grips`);

    // 3. Check which shafts already exist as equipment
    console.log('\n🔍 Checking for existing shaft equipment...');
    const { data: existingShaftEquipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('category', 'shaft');

    const existingShaftKeys = new Set(
      existingShaftEquipment?.map(e => `${e.brand}|${e.model}`) || []
    );

    // 4. Check which grips already exist as equipment
    console.log('🔍 Checking for existing grip equipment...');
    const { data: existingGripEquipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('category', 'grip');

    const existingGripKeys = new Set(
      existingGripEquipment?.map(e => `${e.brand}|${e.model}`) || []
    );

    // 5. Prepare new shaft equipment to insert
    const newShafts = Object.values(uniqueShafts)
      .filter(shaft => !existingShaftKeys.has(`${shaft.brand}|${shaft.model}`))
      .map(shaft => ({
        brand: shaft.brand,
        model: shaft.model,
        category: 'shaft',
        msrp: 0, // Will need to be updated manually
        created_at: new Date().toISOString()
      }));

    // 6. Prepare new grip equipment to insert
    const newGrips = Object.values(uniqueGrips)
      .filter(grip => !existingGripKeys.has(`${grip.brand}|${grip.model}`))
      .map(grip => ({
        brand: grip.brand,
        model: grip.model,
        category: 'grip',
        msrp: 0, // Will need to be updated manually
        created_at: new Date().toISOString()
      }));

    // 7. Insert new shafts
    if (newShafts.length > 0) {
      console.log(`\n✅ Inserting ${newShafts.length} new shaft equipment items...`);
      const { error: insertShaftError } = await supabase
        .from('equipment')
        .insert(newShafts);

      if (insertShaftError) {
        console.error('Error inserting shafts:', insertShaftError);
      } else {
        console.log('Shafts inserted successfully!');
        console.log('Sample shafts added:');
        newShafts.slice(0, 5).forEach(s => {
          console.log(`  - ${s.brand} ${s.model}`);
        });
        if (newShafts.length > 5) {
          console.log(`  ... and ${newShafts.length - 5} more`);
        }
      }
    } else {
      console.log('\n✅ All shafts already exist as equipment items');
    }

    // 8. Insert new grips
    if (newGrips.length > 0) {
      console.log(`\n✅ Inserting ${newGrips.length} new grip equipment items...`);
      const { error: insertGripError } = await supabase
        .from('equipment')
        .insert(newGrips);

      if (insertGripError) {
        console.error('Error inserting grips:', insertGripError);
      } else {
        console.log('Grips inserted successfully!');
        console.log('Sample grips added:');
        newGrips.slice(0, 5).forEach(g => {
          console.log(`  - ${g.brand} ${g.model}`);
        });
        if (newGrips.length > 5) {
          console.log(`  ... and ${newGrips.length - 5} more`);
        }
      }
    } else {
      console.log('\n✅ All grips already exist as equipment items');
    }

    // 9. Summary
    console.log('\n📊 Migration Summary:');
    console.log(`Total unique shafts found: ${Object.keys(uniqueShafts).length}`);
    console.log(`New shaft equipment created: ${newShafts.length}`);
    console.log(`Total unique grips found: ${Object.keys(uniqueGrips).length}`);
    console.log(`New grip equipment created: ${newGrips.length}`);
    
    console.log('\n💡 Next Steps:');
    console.log('1. Update MSRP values for the new equipment items');
    console.log('2. Upload photos for shafts and grips using the equipment photo upload feature');
    console.log('3. The existing shaft/grip tables remain unchanged for club customization');

  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Run the migration
migrateShaftsAndGrips().catch(console.error);