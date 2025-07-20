import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOldTables() {
  console.log('🔍 Checking if old shaft/grip tables can be safely removed...\n');

  try {
    // Check if old tables exist and have data
    const { data: shafts, error: shaftError } = await supabase
      .from('shafts')
      .select('*', { count: 'exact', head: true });

    const { data: grips, error: gripError } = await supabase
      .from('grips')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Old Tables Status:');
    console.log('===================');
    
    if (shaftError) {
      console.log('✅ shafts table: Not found or inaccessible');
    } else {
      console.log(`⚠️  shafts table: Exists (${shafts?.length || 0} rows)`);
    }
    
    if (gripError) {
      console.log('✅ grips table: Not found or inaccessible');
    } else {
      console.log(`⚠️  grips table: Exists (${grips?.length || 0} rows)`);
    }

    // Check for any references to shaft_id/grip_id in bag_equipment
    console.log('\n🔗 Checking bag_equipment references:');
    console.log('=====================================');
    
    const { data: bagEquipmentWithShafts, count: shaftRefCount } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('shaft_id', 'is', null);

    const { data: bagEquipmentWithGrips, count: gripRefCount } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('grip_id', 'is', null);

    console.log(`✅ Bag equipment with shaft_id references: ${shaftRefCount || 0}`);
    console.log(`✅ Bag equipment with grip_id references: ${gripRefCount || 0}`);

    // Check equipment table for shaft/grip categories
    console.log('\n📦 Equipment table shaft/grip items:');
    console.log('====================================');
    
    const { count: equipmentShaftCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'shaft');

    const { count: equipmentGripCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'grip');

    console.log(`✅ Equipment table shafts: ${equipmentShaftCount || 0}`);
    console.log(`✅ Equipment table grips: ${equipmentGripCount || 0}`);

    // Final recommendation
    console.log('\n📋 Recommendation:');
    console.log('==================');
    
    if (!shaftError || !gripError) {
      console.log('⚠️  Old tables still exist. Consider running cleanup after verifying all data is migrated.');
      console.log('   To remove old tables, you can run:');
      console.log('   DROP TABLE IF EXISTS shafts CASCADE;');
      console.log('   DROP TABLE IF EXISTS grips CASCADE;');
    } else {
      console.log('✅ Old tables appear to be already removed or inaccessible.');
    }

    if ((shaftRefCount || 0) > 0 || (gripRefCount || 0) > 0) {
      console.log('✅ bag_equipment table is using the new shaft_id/grip_id columns correctly.');
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkOldTables();