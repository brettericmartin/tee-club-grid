import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDuplicateBags() {
  // Find equipment that appears multiple times in the same bag
  const { data: bagEquipment } = await supabase
    .from('bag_equipment')
    .select('bag_id, equipment_id')
    .order('bag_id');
    
  if (!bagEquipment) return;
  
  // Group by bag_id and equipment_id to find duplicates
  const bagEquipmentMap = {};
  bagEquipment.forEach(item => {
    const key = `${item.bag_id}_${item.equipment_id}`;
    if (!bagEquipmentMap[key]) {
      bagEquipmentMap[key] = { count: 0, bag_id: item.bag_id, equipment_id: item.equipment_id };
    }
    bagEquipmentMap[key].count++;
  });
  
  // Find duplicates
  const duplicates = Object.values(bagEquipmentMap).filter(item => item.count > 1);
  
  if (duplicates.length > 0) {
    console.log('Found duplicate equipment in bags:');
    console.log(duplicates);
    
    // Test with the first duplicate
    const testEquipmentId = duplicates[0].equipment_id;
    console.log('\nTesting with equipment ID:', testEquipmentId);
    
    // Get equipment details
    const { data: equipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .eq('id', testEquipmentId)
      .single();
      
    console.log('Equipment:', equipment);
    
    // Test both query approaches
    console.log('\n=== Old approach (from bag_equipment) ===');
    const { data: oldApproach } = await supabase
      .from('bag_equipment')
      .select(`
        bag_id,
        user_bags!inner (
          id,
          name,
          likes_count,
          user_id,
          profiles (
            username
          )
        )
      `)
      .eq('equipment_id', testEquipmentId)
      .order('likes_count', { ascending: false, referencedTable: 'user_bags' })
      .limit(10);
      
    console.log('Count:', oldApproach?.length);
    if (oldApproach) {
      console.log('Results:', oldApproach.map(item => ({
        bag_id: item.bag_id,
        bag_name: item.user_bags.name,
        username: item.user_bags.profiles?.username
      })));
    }
    
    console.log('\n=== New approach (from user_bags) ===');
    const { data: newApproach } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        likes_count,
        user_id,
        profiles (
          username
        ),
        bag_equipment!inner (
          equipment_id
        )
      `)
      .eq('bag_equipment.equipment_id', testEquipmentId)
      .order('likes_count', { ascending: false })
      .limit(10);
      
    console.log('Count:', newApproach?.length);
    if (newApproach) {
      console.log('Results:', newApproach.map(bag => ({
        bag_id: bag.id,
        bag_name: bag.name,
        username: bag.profiles?.username,
        equipment_count: bag.bag_equipment?.length
      })));
    }
  } else {
    console.log('No duplicate equipment found in any bags');
  }
}

checkDuplicateBags().catch(console.error);