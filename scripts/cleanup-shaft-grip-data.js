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

async function cleanupShaftGripData() {
  console.log('🧹 Starting shaft and grip data cleanup...\n');

  try {
    // 1. Remove all shaft/grip entries from bag_equipment
    console.log('📦 Removing shaft/grip items from user bags...');
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select('id, equipment:equipment_id(category)')
      .in('equipment.category', ['shaft', 'grip']);

    if (bagError) {
      console.error('Error fetching bag equipment:', bagError);
    } else if (bagEquipment?.length > 0) {
      const idsToDelete = bagEquipment.map(item => item.id);
      const { error: deleteError } = await supabase
        .from('bag_equipment')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting bag equipment:', deleteError);
      } else {
        console.log(`✅ Removed ${idsToDelete.length} shaft/grip items from bags`);
      }
    } else {
      console.log('✅ No shaft/grip items found in bags');
    }

    // 2. Remove all shaft/grip items from equipment table
    console.log('\n🗑️ Removing shaft/grip equipment items...');
    const { error: equipDeleteError } = await supabase
      .from('equipment')
      .delete()
      .in('category', ['shaft', 'grip']);

    if (equipDeleteError) {
      console.error('Error deleting equipment:', equipDeleteError);
    } else {
      console.log('✅ Removed all shaft/grip equipment items');
    }

    // 3. Clean up shafts table - keep only stock option
    console.log('\n🔧 Cleaning up shafts table...');
    // First delete all existing shafts
    const { error: deleteShaftsError } = await supabase
      .from('shafts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteShaftsError) {
      console.error('Error deleting shafts:', deleteShaftsError);
    }

    // Insert default stock shaft for each category
    const categories = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
    const stockShafts = categories.map(category => ({
      brand: 'Stock',
      model: 'Stock Shaft',
      flex: 'R',
      weight: null,
      category: category,
      is_stock: true,
      price: 0,
      torque: null,
      launch_profile: 'Mid',
      spin_profile: 'Mid'
    }));

    const { error: insertShaftsError } = await supabase
      .from('shafts')
      .insert(stockShafts);

    if (insertShaftsError) {
      console.error('Error inserting stock shafts:', insertShaftsError);
    } else {
      console.log(`✅ Created ${stockShafts.length} stock shaft options (one per club category)`);
    }

    // 4. Clean up grips table - keep only stock option
    console.log('\n🎯 Cleaning up grips table...');
    // First delete all existing grips
    const { error: deleteGripsError } = await supabase
      .from('grips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteGripsError) {
      console.error('Error deleting grips:', deleteGripsError);
    }

    // Insert default stock grip
    const stockGrip = {
      brand: 'Stock',
      model: 'Stock Grip',
      size: 'Standard',
      material: 'Rubber',
      weight_grams: 50,
      is_stock: true,
      price: 0,
      color: null
    };

    const { error: insertGripError } = await supabase
      .from('grips')
      .insert(stockGrip);

    if (insertGripError) {
      console.error('Error inserting stock grip:', insertGripError);
    } else {
      console.log('✅ Created stock grip option');
    }

    console.log('\n🎉 Cleanup complete!');
    console.log('- All shaft/grip equipment items removed');
    console.log('- All shaft/grip entries removed from bags');
    console.log('- Shafts table reset to stock options only');
    console.log('- Grips table reset to stock option only');
    console.log('\nUsers can now build their own shaft/grip database using the "Add New" feature!');

  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run the cleanup
cleanupShaftGripData().catch(console.error);