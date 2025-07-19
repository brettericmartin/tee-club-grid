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

async function cleanupShaftGripDataFixed() {
  console.log('🧹 Finishing shaft and grip table cleanup...\n');

  try {
    // Since equipment items and bag_equipment entries were already deleted,
    // we just need to fix the shafts and grips tables

    // 1. Check current shafts structure
    console.log('🔍 Checking shafts table structure...');
    const { data: existingShafts } = await supabase
      .from('shafts')
      .select('*')
      .limit(1);
    
    if (existingShafts && existingShafts.length > 0) {
      console.log('Sample shaft columns:', Object.keys(existingShafts[0]));
    }

    // 2. Clean up shafts table - keep only stock option
    console.log('\n🔧 Resetting shafts table to stock options...');
    
    // First get the correct columns from an existing shaft
    const shaftColumns = existingShafts?.[0] ? Object.keys(existingShafts[0]) : [];
    
    // Delete all existing shafts
    const { error: deleteShaftsError } = await supabase
      .from('shafts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteShaftsError) {
      console.error('Error deleting shafts:', deleteShaftsError);
    }

    // Insert default stock shaft for each category with minimal data
    const categories = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
    const stockShafts = categories.map(category => ({
      brand: 'Stock',
      model: 'Stock Shaft',
      flex: 'R',
      category: category,
      is_stock: true,
      price: 0
    }));

    const { error: insertShaftsError } = await supabase
      .from('shafts')
      .insert(stockShafts);

    if (insertShaftsError) {
      console.error('Error inserting stock shafts:', insertShaftsError);
    } else {
      console.log(`✅ Created ${stockShafts.length} stock shaft options (one per club category)`);
    }

    // 3. Check current grips structure
    console.log('\n🔍 Checking grips table structure...');
    const { data: existingGrips } = await supabase
      .from('grips')
      .select('*')
      .limit(1);
    
    if (existingGrips && existingGrips.length > 0) {
      console.log('Sample grip columns:', Object.keys(existingGrips[0]));
    }

    // 4. Clean up grips table - keep only stock option
    console.log('\n🎯 Resetting grips table to stock option...');
    
    // Delete all existing grips
    const { error: deleteGripsError } = await supabase
      .from('grips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteGripsError) {
      console.error('Error deleting grips:', deleteGripsError);
    }

    // Insert default stock grip with minimal data
    const stockGrip = {
      brand: 'Stock',
      model: 'Stock Grip',
      size: 'Standard',
      is_stock: true,
      price: 0
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
    console.log('- Shafts table reset to stock options only');
    console.log('- Grips table reset to stock option only');
    console.log('\nUsers can now build their own shaft/grip database using the "Add New" feature!');

  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run the cleanup
cleanupShaftGripDataFixed().catch(console.error);