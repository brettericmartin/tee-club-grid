import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function clearEquipmentData() {
  console.log('🗑️  Clearing equipment data...\n');

  try {
    // First, delete equipment_photos (foreign key constraint)
    console.log('Deleting equipment photos...');
    const { error: photosError, count: photosCount } = await supabase
      .from('equipment_photos')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (photosError) {
      console.error('Error deleting photos:', photosError);
      return;
    }
    console.log(`✅ Deleted ${photosCount || 'all'} equipment photos\n`);

    // Delete equipment_saves
    console.log('Deleting equipment saves...');
    const { error: savesError, count: savesCount } = await supabase
      .from('equipment_saves')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (savesError) {
      console.error('Error deleting saves:', savesError);
    } else {
      console.log(`✅ Deleted ${savesCount || 'all'} equipment saves\n`);
    }

    // Delete bag_equipment (if any)
    console.log('Deleting bag equipment...');
    const { error: bagError, count: bagCount } = await supabase
      .from('bag_equipment')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (bagError) {
      console.error('Error deleting bag equipment:', bagError);
    } else {
      console.log(`✅ Deleted ${bagCount || 'all'} bag equipment entries\n`);
    }

    // Finally, delete all equipment
    console.log('Deleting all equipment...');
    const { error: equipmentError, count: equipmentCount } = await supabase
      .from('equipment')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (equipmentError) {
      console.error('Error deleting equipment:', equipmentError);
      return;
    }

    console.log(`✅ Deleted ${equipmentCount || 'all'} equipment items\n`);
    console.log('🎉 Successfully cleared all equipment data!');
    
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

clearEquipmentData().catch(console.error);