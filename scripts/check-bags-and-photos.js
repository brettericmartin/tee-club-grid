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

async function checkBagsAndPhotos() {
  console.log('=== Checking Bags and Equipment Photos ===\n');

  try {
    // 1. Check how many bags exist and their tee counts
    console.log('1. Checking bags and their tee counts:');
    const { data: bags, error: bagsError } = await supabase
      .from('bags')
      .select('id, name, user_id, tee_count, created_at')
      .order('created_at', { ascending: false });

    if (bagsError) {
      console.error('Error fetching bags:', bagsError);
    } else {
      console.log(`Total bags: ${bags.length}`);
      bags.forEach(bag => {
        console.log(`  - ${bag.name} (ID: ${bag.id}, User: ${bag.user_id}, Tees: ${bag.tee_count || 0})`);
      });
    }

    // 2. Check the exact query that might be failing for bags
    console.log('\n2. Testing the bags query with equipment count:');
    const { data: bagsWithEquipment, error: bagsWithEquipmentError } = await supabase
      .from('bags')
      .select(`
        *,
        bag_equipment (
          count
        )
      `)
      .eq('user_id', 'cc2ceae6-e04f-4c22-8f23-2c5c6f13c85a') // Testing with a known user ID
      .order('created_at', { ascending: false });

    if (bagsWithEquipmentError) {
      console.error('Error with bags equipment query:', bagsWithEquipmentError);
    } else {
      console.log('Bags with equipment count query successful:');
      bagsWithEquipment?.forEach(bag => {
        console.log(`  - ${bag.name}: ${bag.bag_equipment?.[0]?.count || 0} items`);
      });
    }

    // 3. Check equipment photos table
    console.log('\n3. Checking equipment photos:');
    const { data: equipmentPhotos, error: photosError } = await supabase
      .from('equipment_photos')
      .select('id, equipment_id, photo_url, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (photosError) {
      console.error('Error fetching equipment photos:', photosError);
    } else {
      console.log(`Total equipment photos (first 10): ${equipmentPhotos?.length || 0}`);
      
      // Count unique equipment items with photos
      const { data: equipmentWithPhotos, error: countError } = await supabase
        .from('equipment_photos')
        .select('equipment_id', { count: 'exact', head: true });

      if (!countError) {
        console.log(`Total photos in database: ${equipmentWithPhotos}`);
      }

      // Show sample photos
      equipmentPhotos?.forEach(photo => {
        console.log(`  - Equipment ID: ${photo.equipment_id}, URL: ${photo.photo_url.substring(0, 50)}...`);
      });
    }

    // 4. Check equipment items that have photos
    console.log('\n4. Equipment items with photos:');
    const { data: equipmentWithPhotoCount, error: equipmentError } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        equipment_photos (
          count
        )
      `)
      .order('brand', { ascending: true })
      .limit(20);

    if (equipmentError) {
      console.error('Error fetching equipment with photos:', equipmentError);
    } else {
      const itemsWithPhotos = equipmentWithPhotoCount?.filter(item => item.equipment_photos?.[0]?.count > 0);
      console.log(`Equipment items with photos: ${itemsWithPhotos?.length || 0} out of ${equipmentWithPhotoCount?.length || 0} checked`);
      itemsWithPhotos?.forEach(item => {
        console.log(`  - ${item.brand} ${item.model}: ${item.equipment_photos[0].count} photos`);
      });
    }

    // 5. Check if the exact RPC function exists for the Real page
    console.log('\n5. Checking for get_bag_tees RPC function:');
    const { data: rpcTest, error: rpcError } = await supabase
      .rpc('get_bag_tees', { bag_id: 'cc2ceae6-e04f-4c22-8f23-2c5c6f13c85a' });

    if (rpcError) {
      console.error('RPC function error:', rpcError);
      console.log('This might be why the Real page is failing');
    } else {
      console.log('RPC function exists and returned:', rpcTest?.length || 0, 'results');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }

  process.exit(0);
}

checkBagsAndPhotos();