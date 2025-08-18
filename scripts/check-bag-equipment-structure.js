import { supabase } from './supabase-admin.js';

async function checkBagEquipmentStructure() {
  console.log('🔍 Checking bag_equipment table structure...\n');

  try {
    // Try to get a sample record to see current structure
    const { data, error } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying bag_equipment table:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('📋 Current bag_equipment table columns:');
      Object.keys(data[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof data[0][column]}`);
      });
    } else {
      console.log('📋 bag_equipment table exists but has no data');
      
      // Try to insert a test record to see what columns are expected
      const testInsert = {
        user_id: 'test',
        bag_id: 'test', 
        equipment_id: 'test'
      };

      const { error: insertError } = await supabase
        .from('bag_equipment')
        .insert([testInsert]);

      if (insertError) {
        console.log('ℹ️  Insert error reveals expected columns:', insertError.message);
      }
    }

    // Check if custom_specs column already exists by trying to query it
    const { data: customSpecsTest, error: customSpecsError } = await supabase
      .from('bag_equipment')
      .select('custom_specs')
      .limit(1);

    if (customSpecsError) {
      if (customSpecsError.message.includes('custom_specs')) {
        console.log('❌ custom_specs column does NOT exist');
        console.log('🔧 Column needs to be added');
      } else {
        console.log('⚠️  Error checking custom_specs column:', customSpecsError.message);
      }
    } else {
      console.log('✅ custom_specs column already exists');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the check
checkBagEquipmentStructure();