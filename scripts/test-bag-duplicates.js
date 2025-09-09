import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testBagDuplicates() {
  // First find an equipment that has bags
  const { data: sampleEquipment } = await supabase
    .from('bag_equipment')
    .select('equipment_id')
    .limit(1);
    
  const equipmentId = sampleEquipment?.[0]?.equipment_id || '333eadc3-c508-4ed6-9d05-36e57583b216';
  
  console.log('Testing for equipment ID:', equipmentId);
  
  // First, let's see what's in bag_equipment
  const { data: bagEquipment, error: error1 } = await supabase
    .from('bag_equipment')
    .select('*')
    .eq('equipment_id', equipmentId);
    
  console.log('\n=== bag_equipment entries ===');
  console.log('Count:', bagEquipment?.length);
  if (bagEquipment) {
    const bagIds = [...new Set(bagEquipment.map(item => item.bag_id))];
    console.log('Unique bag IDs:', bagIds);
    console.log('All entries:', bagEquipment.map(item => ({
      id: item.id,
      bag_id: item.bag_id,
      equipment_id: item.equipment_id
    })));
  }
  
  // Now test the new query approach
  const { data: bags, error: error2 } = await supabase
    .from('user_bags')
    .select(`
      id,
      name,
      likes_count,
      user_id,
      profiles (
        username,
        display_name,
        avatar_url,
        handicap
      ),
      bag_equipment!inner (
        equipment_id
      )
    `)
    .eq('bag_equipment.equipment_id', equipmentId)
    .order('likes_count', { ascending: false })
    .limit(10);
    
  console.log('\n=== user_bags query result ===');
  console.log('Count:', bags?.length);
  if (bags) {
    console.log('Bags:', bags.map(bag => ({
      id: bag.id,
      name: bag.name,
      username: bag.profiles?.username,
      equipment_count: bag.bag_equipment?.length
    })));
  }
  
  if (error1) console.error('Error 1:', error1);
  if (error2) console.error('Error 2:', error2);
}

testBagDuplicates().catch(console.error);