import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActualTables() {
  console.log('=== Checking Actual Database Tables ===\n');

  try {
    // Check if user_bags table exists (likely the actual bags table)
    console.log('1. Checking user_bags table:');
    const { data: userBags, error: userBagsError } = await supabase
      .from('user_bags')
      .select('*')
      .limit(5);

    if (userBagsError) {
      console.error('Error fetching user_bags:', userBagsError);
    } else {
      console.log(`Found ${userBags?.length || 0} user bags`);
      userBags?.forEach(bag => {
        console.log(`  - Bag ID: ${bag.id}, User: ${bag.user_id}, Name: ${bag.name || 'Unnamed'}, Tees: ${bag.tee_count || 0}`);
      });
    }

    // Check bag_equipment table
    console.log('\n2. Checking bag_equipment table:');
    const { data: bagEquipment, error: bagEquipmentError } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(10);

    if (bagEquipmentError) {
      console.error('Error fetching bag_equipment:', bagEquipmentError);
    } else {
      console.log(`Found ${bagEquipment?.length || 0} bag equipment entries`);
      if (bagEquipment && bagEquipment.length > 0) {
        console.log('Sample bag IDs:', [...new Set(bagEquipment.map(be => be.bag_id))].slice(0, 5));
      }
    }

    // Check for bag_tees table
    console.log('\n3. Checking bag_tees table:');
    const { data: bagTees, error: bagTeesError } = await supabase
      .from('bag_tees')
      .select('*')
      .limit(5);

    if (bagTeesError) {
      console.error('Error fetching bag_tees:', bagTeesError);
    } else {
      console.log(`Found ${bagTees?.length || 0} bag tees`);
    }

    // Check badges table (since it was suggested in the error)
    console.log('\n4. Checking badges table:');
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .limit(5);

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
    } else {
      console.log(`Found ${badges?.length || 0} badges`);
    }

    // Check equipment_photos count
    console.log('\n5. Equipment photos count:');
    const { count: photoCount, error: photoCountError } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });

    if (photoCountError) {
      console.error('Error counting photos:', photoCountError);
    } else {
      console.log(`Total equipment photos in database: ${photoCount}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }

  process.exit(0);
}

checkActualTables();