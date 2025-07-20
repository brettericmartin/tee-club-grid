import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateShaftsAndGrips() {
  console.log('Starting migration of shafts and grips to equipment table...\n');

  try {
    // Migrate shafts
    console.log('--- Migrating Shafts ---');
    const { data: shafts, error: shaftsError } = await supabase
      .from('shafts')
      .select('*');

    if (shaftsError) {
      console.error('Error fetching shafts:', shaftsError);
      return;
    }

    console.log(`Found ${shafts.length} shafts to migrate`);

    for (const shaft of shafts) {
      // Check if this shaft already exists in equipment table
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('brand', shaft.brand)
        .eq('model', shaft.model)
        .eq('category', 'shaft')
        .single();

      if (existing) {
        console.log(`Shaft already exists: ${shaft.brand} ${shaft.model}`);
        continue;
      }

      // Create equipment entry for shaft
      const equipmentData = {
        brand: shaft.brand,
        model: shaft.model,
        category: 'shaft',
        msrp: shaft.price || 0,
        specs: {
          flex: shaft.flex,
          weight: shaft.weight_grams,
          launch_profile: shaft.launch_profile,
          spin_profile: shaft.spin_profile,
          torque: shaft.torque,
          length: shaft.length,
          tip_diameter: shaft.tip_diameter,
          butt_diameter: shaft.butt_diameter,
          is_stock: shaft.is_stock
        },
        added_by_user_id: shaft.added_by_user_id,
        verified: shaft.verified || false,
        popularity_score: shaft.times_used || 0
      };

      const { data: newEquipment, error: insertError } = await supabase
        .from('equipment')
        .insert(equipmentData)
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting shaft ${shaft.brand} ${shaft.model}:`, insertError);
      } else {
        console.log(`✅ Migrated shaft: ${shaft.brand} ${shaft.model} (ID: ${newEquipment.id})`);
        
        // Update shaft record with equipment_id reference
        await supabase
          .from('shafts')
          .update({ equipment_id: newEquipment.id })
          .eq('id', shaft.id);
      }
    }

    // Migrate grips
    console.log('\n--- Migrating Grips ---');
    const { data: grips, error: gripsError } = await supabase
      .from('grips')
      .select('*');

    if (gripsError) {
      console.error('Error fetching grips:', gripsError);
      return;
    }

    console.log(`Found ${grips.length} grips to migrate`);

    for (const grip of grips) {
      // Check if this grip already exists in equipment table
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('brand', grip.brand)
        .eq('model', grip.model)
        .eq('category', 'grip')
        .single();

      if (existing) {
        console.log(`Grip already exists: ${grip.brand} ${grip.model}`);
        continue;
      }

      // Create equipment entry for grip
      const equipmentData = {
        brand: grip.brand,
        model: grip.model,
        category: 'grip',
        msrp: grip.price || 0,
        specs: {
          size: grip.size,
          weight: grip.weight_grams,
          material: grip.material,
          texture: grip.texture,
          core_size: grip.core_size,
          is_stock: grip.is_stock
        },
        added_by_user_id: grip.added_by_user_id,
        verified: grip.verified || false,
        popularity_score: grip.times_used || 0
      };

      const { data: newEquipment, error: insertError } = await supabase
        .from('equipment')
        .insert(equipmentData)
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting grip ${grip.brand} ${grip.model}:`, insertError);
      } else {
        console.log(`✅ Migrated grip: ${grip.brand} ${grip.model} (ID: ${newEquipment.id})`);
        
        // Update grip record with equipment_id reference
        await supabase
          .from('grips')
          .update({ equipment_id: newEquipment.id })
          .eq('id', grip.id);
      }
    }

    console.log('\n--- Migration Complete ---');
    
    // Verify migration
    const { count: shaftCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'shaft');
      
    const { count: gripCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'grip');
      
    console.log(`\nTotal shafts in equipment table: ${shaftCount}`);
    console.log(`Total grips in equipment table: ${gripCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateShaftsAndGrips();