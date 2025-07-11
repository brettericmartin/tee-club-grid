import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEquipmentPhotosSchema() {
  console.log('\n📸 Checking Equipment Photos Schema\n');
  console.log('===================================\n');

  try {
    // 1. Check equipment_photos table structure
    console.log('1. Checking equipment_photos table...\n');
    
    // Try to query the table
    const { data: samplePhotos, error } = await supabase
      .from('equipment_photos')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error accessing equipment_photos:', error);
      console.log('\nThe equipment_photos table might not exist or have different structure.');
    } else {
      console.log('Sample equipment_photos record:', samplePhotos);
    }

    // 2. Check if there's a bag_equipment_photos table instead
    console.log('\n2. Checking for bag_equipment_photos table...\n');
    
    const { data: bagPhotos, error: bagError } = await supabase
      .from('bag_equipment_photos')
      .select('*')
      .limit(1);

    if (bagError) {
      console.log('No bag_equipment_photos table found.');
    } else {
      console.log('Found bag_equipment_photos table!');
      console.log('Sample record:', bagPhotos);
    }

    // 3. Check bag_equipment table to see if photos are stored there
    console.log('\n3. Checking bag_equipment table for photo columns...\n');
    
    const { data: bagEquipment } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);

    if (bagEquipment && bagEquipment.length > 0) {
      const columns = Object.keys(bagEquipment[0]);
      console.log('bag_equipment columns:', columns);
      
      const photoColumns = columns.filter(col => col.includes('photo') || col.includes('image'));
      if (photoColumns.length > 0) {
        console.log('Photo-related columns found:', photoColumns);
      } else {
        console.log('No photo columns found in bag_equipment table.');
      }
    }

    console.log('\n===================================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkEquipmentPhotosSchema().catch(console.error);