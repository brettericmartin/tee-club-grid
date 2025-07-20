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

async function checkShaftGripData() {
  console.log('Checking shaft and grip data...\n');

  try {
    // Check if separate shafts table exists and has data
    const { data: shafts, error: shaftsError } = await supabase
      .from('shafts')
      .select('*')
      .limit(5);

    if (shaftsError) {
      console.log('❌ No separate shafts table found (this is expected if using equipment table)');
    } else {
      console.log(`✅ Found ${shafts?.length || 0} entries in shafts table`);
      if (shafts && shafts.length > 0) {
        console.log('Sample shaft:', shafts[0]);
      }
    }

    // Check if separate grips table exists and has data
    const { data: grips, error: gripsError } = await supabase
      .from('grips')
      .select('*')
      .limit(5);

    if (gripsError) {
      console.log('❌ No separate grips table found (this is expected if using equipment table)');
    } else {
      console.log(`✅ Found ${grips?.length || 0} entries in grips table`);
      if (grips && grips.length > 0) {
        console.log('Sample grip:', grips[0]);
      }
    }

    console.log('\n--- Checking equipment table for shafts and grips ---\n');

    // Check equipment table for shaft entries
    const { data: shaftEquipment, count: shaftCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact' })
      .eq('category', 'shaft')
      .limit(5);

    console.log(`Found ${shaftCount || 0} shafts in equipment table`);
    if (shaftEquipment && shaftEquipment.length > 0) {
      console.log('Sample shaft equipment:', {
        id: shaftEquipment[0].id,
        brand: shaftEquipment[0].brand,
        model: shaftEquipment[0].model,
        specs: shaftEquipment[0].specs
      });
    }

    // Check equipment table for grip entries
    const { data: gripEquipment, count: gripCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact' })
      .eq('category', 'grip')
      .limit(5);

    console.log(`Found ${gripCount || 0} grips in equipment table`);
    if (gripEquipment && gripEquipment.length > 0) {
      console.log('Sample grip equipment:', {
        id: gripEquipment[0].id,
        brand: gripEquipment[0].brand,
        model: gripEquipment[0].model,
        specs: gripEquipment[0].specs
      });
    }

    console.log('\n--- Checking bag_equipment for shaft/grip references ---\n');

    // Check if bag_equipment has shaft_id or grip_id columns
    const { data: bagEquipmentSample } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);

    if (bagEquipmentSample && bagEquipmentSample.length > 0) {
      const hasShaftId = 'shaft_id' in bagEquipmentSample[0];
      const hasGripId = 'grip_id' in bagEquipmentSample[0];
      
      console.log(`bag_equipment has shaft_id column: ${hasShaftId ? '✅' : '❌'}`);
      console.log(`bag_equipment has grip_id column: ${hasGripId ? '✅' : '❌'}`);
      
      // Check custom_specs field
      if (bagEquipmentSample[0].custom_specs) {
        console.log('Sample custom_specs:', bagEquipmentSample[0].custom_specs);
      }
    }

    console.log('\n--- Summary ---\n');
    console.log('Next steps:');
    console.log('1. Run the migration to add shaft_id and grip_id columns to bag_equipment');
    console.log('2. Migrate any existing shaft/grip data from separate tables to equipment table');
    console.log('3. Update the code to use the unified approach');

  } catch (error) {
    console.error('Error checking data:', error);
  }
}

checkShaftGripData();