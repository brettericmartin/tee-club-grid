import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkOrphanedBagEquipment() {
  console.log('Checking for orphaned bag_equipment records...\n');
  
  // Get all bag_equipment records
  const { data: bagEquipment, error: error1 } = await supabase
    .from('bag_equipment')
    .select('*');
    
  if (error1) {
    console.error('Error fetching bag_equipment:', error1);
    return;
  }
  
  console.log(`Total bag_equipment records: ${bagEquipment?.length || 0}`);
  
  // Get all user_bags
  const { data: userBags, error: error2 } = await supabase
    .from('user_bags')
    .select('id');
    
  if (error2) {
    console.error('Error fetching user_bags:', error2);
    return;
  }
  
  const validBagIds = new Set(userBags?.map(bag => bag.id) || []);
  
  // Check for orphaned records (bag_equipment entries where bag doesn't exist)
  const orphanedRecords = bagEquipment?.filter(item => !validBagIds.has(item.bag_id)) || [];
  
  if (orphanedRecords.length > 0) {
    console.log(`\nFound ${orphanedRecords.length} orphaned bag_equipment records:`);
    orphanedRecords.forEach(record => {
      console.log(`  - ID: ${record.id}, Bag ID: ${record.bag_id}, Equipment ID: ${record.equipment_id}`);
    });
  } else {
    console.log('\nNo orphaned records found.');
  }
  
  // Check for the specific TaylorMade BRNR Mini
  const equipmentId = '333eadc3-c508-4ed6-9d05-36e57583b216';
  console.log(`\n=== Checking TaylorMade BRNR Mini (${equipmentId}) ===`);
  
  const { data: brnrBagEquipment, error: error3 } = await supabase
    .from('bag_equipment')
    .select(`
      *,
      user_bags (
        id,
        name,
        user_id,
        profiles (
          username
        )
      )
    `)
    .eq('equipment_id', equipmentId);
    
  if (error3) {
    console.error('Error fetching BRNR bag_equipment:', error3);
    return;
  }
  
  console.log(`Found ${brnrBagEquipment?.length || 0} bag_equipment records for BRNR Mini:`);
  
  if (brnrBagEquipment && brnrBagEquipment.length > 0) {
    brnrBagEquipment.forEach(record => {
      console.log(`\nRecord ID: ${record.id}`);
      console.log(`  Bag ID: ${record.bag_id}`);
      console.log(`  Bag exists: ${record.user_bags ? 'YES' : 'NO'}`);
      if (record.user_bags) {
        console.log(`  Bag Name: ${record.user_bags.name}`);
        console.log(`  Username: ${record.user_bags.profiles?.username}`);
      }
      console.log(`  Created: ${record.created_at}`);
      console.log(`  Updated: ${record.updated_at}`);
    });
  }
  
  // Check if there are multiple records for the same bag
  const bagCounts = {};
  brnrBagEquipment?.forEach(record => {
    const bagId = record.bag_id;
    bagCounts[bagId] = (bagCounts[bagId] || 0) + 1;
  });
  
  const duplicates = Object.entries(bagCounts).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('\n⚠️  Found duplicate entries for the same bag:');
    duplicates.forEach(([bagId, count]) => {
      console.log(`  Bag ${bagId}: ${count} entries`);
    });
  }
}

checkOrphanedBagEquipment().catch(console.error);