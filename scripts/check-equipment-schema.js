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

async function checkEquipmentSchema() {
  console.log('🔧 Equipment Schema Check\n');
  console.log('========================\n');

  try {
    // 1. Check equipment table structure
    console.log('1. Equipment Table Structure:');
    const { data: equipmentSample, error: equipmentError } = await supabase
      .from('equipment')
      .select('*')
      .limit(1);

    if (equipmentError) {
      console.log('✗ Error accessing equipment table:', equipmentError.message);
    } else if (equipmentSample?.length > 0) {
      console.log('✓ Equipment table columns:', Object.keys(equipmentSample[0]));
    }

    // 2. Check shaft and grip categories
    console.log('\n2. Shaft and Grip Equipment:');
    const { data: shaftCount } = await supabase
      .from('equipment')
      .select('id', { count: 'exact' })
      .eq('category', 'shaft');
    
    const { data: gripCount } = await supabase
      .from('equipment')
      .select('id', { count: 'exact' })
      .eq('category', 'grip');

    console.log(`✓ Shaft equipment items: ${shaftCount?.length || 0}`);
    console.log(`✓ Grip equipment items: ${gripCount?.length || 0}`);

    // 3. Check shafts table
    console.log('\n3. Shafts Table:');
    const { data: shaftsSample, error: shaftsError } = await supabase
      .from('shafts')
      .select('*')
      .limit(1);

    if (shaftsError) {
      console.log('✗ Error accessing shafts table:', shaftsError.message);
    } else if (shaftsSample?.length > 0) {
      console.log('✓ Shafts table columns:', Object.keys(shaftsSample[0]));
      const { count } = await supabase
        .from('shafts')
        .select('*', { count: 'exact', head: true });
      console.log(`  Total shaft records: ${count}`);
    }

    // 4. Check grips table
    console.log('\n4. Grips Table:');
    const { data: gripsSample, error: gripsError } = await supabase
      .from('grips')
      .select('*')
      .limit(1);

    if (gripsError) {
      console.log('✗ Error accessing grips table:', gripsError.message);
    } else if (gripsSample?.length > 0) {
      console.log('✓ Grips table columns:', Object.keys(gripsSample[0]));
      const { count } = await supabase
        .from('grips')
        .select('*', { count: 'exact', head: true });
      console.log(`  Total grip records: ${count}`);
    }

    // 5. Check bag_equipment with shaft/grip references
    console.log('\n5. Bag Equipment Customization:');
    const { data: bagEquipmentSample } = await supabase
      .from('bag_equipment')
      .select('*, equipment(*), shaft:shafts(*), grip:grips(*)')
      .limit(1);

    if (bagEquipmentSample?.length > 0) {
      console.log('✓ Bag equipment columns:', Object.keys(bagEquipmentSample[0]));
      if (bagEquipmentSample[0].shaft_id) {
        console.log('  ✓ Has shaft customization support');
      }
      if (bagEquipmentSample[0].grip_id) {
        console.log('  ✓ Has grip customization support');
      }
    }

    // 6. Check equipment photos
    console.log('\n6. Equipment Photos:');
    const { data: photoCount } = await supabase
      .from('equipment_photos')
      .select('equipment_id', { count: 'exact' })
      .in('equipment.category', ['shaft', 'grip']);

    console.log(`✓ Shaft/grip photos: ${photoCount?.length || 0}`);

    console.log('\n========================');
    console.log('✅ Schema check complete!');

  } catch (error) {
    console.error('Schema check error:', error);
  }
}

checkEquipmentSchema().catch(console.error);