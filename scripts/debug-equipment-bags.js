import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugEquipmentBags() {
  const equipmentId = '333eadc3-c508-4ed6-9d05-36e57583b216'; // TaylorMade BRNR Mini
  
  console.log('=== Testing getTopBagsWithEquipment logic ===\n');
  
  // Step 1: Get all bag_equipment entries for this equipment
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('bag_id')
    .eq('equipment_id', equipmentId);
  
  console.log('Step 1 - bag_equipment entries:', bagEquipment?.length || 0);
  if (bagEquipment && bagEquipment.length > 0) {
    console.log('Bag IDs found:', bagEquipment.map(item => item.bag_id));
  }
  
  if (bagError) {
    console.error('Error:', bagError);
    return;
  }
  
  // Step 2: Get unique bag IDs
  const uniqueBagIds = [...new Set(bagEquipment?.map(item => item.bag_id) || [])];
  console.log('\nStep 2 - Unique bag IDs:', uniqueBagIds.length);
  console.log('IDs:', uniqueBagIds);
  
  if (uniqueBagIds.length === 0) {
    console.log('\nNo bags found with this equipment.');
    
    // Let's check if this equipment exists at all
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .single();
      
    if (equipment) {
      console.log('\nEquipment exists:', equipment.brand, equipment.model);
    } else {
      console.log('\n⚠️ Equipment not found in database!');
    }
    
    // Check if user "brett" has any bags
    const { data: brettProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'brett')
      .single();
      
    if (brettProfile) {
      const { data: brettBags } = await supabase
        .from('user_bags')
        .select('id, name')
        .eq('user_id', brettProfile.id);
        
      console.log(`\nUser "brett" has ${brettBags?.length || 0} bags:`);
      brettBags?.forEach(bag => {
        console.log(`  - ${bag.name} (${bag.id})`);
      });
      
      // Check what equipment is in brett's bags
      if (brettBags && brettBags.length > 0) {
        for (const bag of brettBags) {
          const { data: bagEquip } = await supabase
            .from('bag_equipment')
            .select(`
              equipment_id,
              equipment (
                brand,
                model
              )
            `)
            .eq('bag_id', bag.id);
            
          console.log(`\nEquipment in "${bag.name}":`);
          bagEquip?.forEach(item => {
            console.log(`  - ${item.equipment?.brand} ${item.equipment?.model}`);
          });
        }
      }
    }
    
    return;
  }
  
  // Step 3: Fetch the bags with their details
  const { data: bags, error: bagsError } = await supabase
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
      )
    `)
    .in('id', uniqueBagIds)
    .order('likes_count', { ascending: false })
    .limit(10);
  
  console.log('\nStep 3 - Bags with details:', bags?.length || 0);
  
  if (bagsError) {
    console.error('Error:', bagsError);
    return;
  }
  
  if (bags && bags.length > 0) {
    console.log('\nBags found:');
    bags.forEach(bag => {
      console.log(`  - ${bag.name} by @${bag.profiles?.username} (${bag.likes_count} likes)`);
    });
  }
}

debugEquipmentBags().catch(console.error);