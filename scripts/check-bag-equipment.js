import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBagEquipment() {
  console.log('Checking bag equipment data...\n');
  
  // Get brett's user ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'brett')
    .single();
    
  if (!profile) {
    console.log('User brett not found');
    return;
  }
  
  console.log('User found:', profile);
  
  // Get user's bags
  const { data: bags } = await supabase
    .from('user_bags')
    .select('*')
    .eq('user_id', profile.id);
    
  console.log(`\nFound ${bags?.length || 0} bags for user`);
  
  if (!bags || bags.length === 0) return;
  
  // Check each bag's equipment
  for (const bag of bags) {
    console.log(`\n📦 Bag: ${bag.name} (${bag.id})`);
    
    // Get equipment with joins
    const { data: equipment, error } = await supabase
      .from('bag_equipment')
      .select(`
        *,
        equipment(*)
      `)
      .eq('bag_id', bag.id);
      
    if (error) {
      console.log('  ❌ Error loading equipment:', error.message);
      continue;
    }
    
    console.log(`  Found ${equipment?.length || 0} items`);
    
    if (equipment && equipment.length > 0) {
      // Check for null equipment
      const nullEquipment = equipment.filter(item => !item.equipment);
      const validEquipment = equipment.filter(item => item.equipment);
      
      console.log(`  ✅ Valid items: ${validEquipment.length}`);
      console.log(`  ⚠️  Items with null equipment: ${nullEquipment.length}`);
      
      if (nullEquipment.length > 0) {
        console.log('\n  Items missing equipment data:');
        for (const item of nullEquipment) {
          console.log(`    - Equipment ID: ${item.equipment_id}`);
          
          // Try to find the equipment
          const { data: equipmentData } = await supabase
            .from('equipment')
            .select('*')
            .eq('id', item.equipment_id)
            .single();
            
          if (equipmentData) {
            console.log(`      ✅ Equipment exists in DB: ${equipmentData.brand} ${equipmentData.model}`);
          } else {
            console.log(`      ❌ Equipment NOT found in database!`);
          }
        }
      }
      
      // Show sample of valid equipment
      if (validEquipment.length > 0) {
        console.log('\n  Sample valid equipment:');
        validEquipment.slice(0, 3).forEach(item => {
          console.log(`    - ${item.equipment.brand} ${item.equipment.model}`);
        });
      }
    }
  }
}

checkBagEquipment().catch(console.error);