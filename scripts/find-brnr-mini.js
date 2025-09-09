import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function findBRNRMini() {
  console.log('=== Finding all TaylorMade BRNR Mini entries ===\n');
  
  // Find all BRNR Mini equipment entries
  const { data: brnrMinis } = await supabase
    .from('equipment')
    .select('*')
    .ilike('model', '%BRNR%Mini%');
    
  console.log(`Found ${brnrMinis?.length || 0} BRNR Mini entries:`);
  
  if (brnrMinis && brnrMinis.length > 0) {
    for (const equipment of brnrMinis) {
      console.log(`\nID: ${equipment.id}`);
      console.log(`  Brand: ${equipment.brand}`);
      console.log(`  Model: ${equipment.model}`);
      console.log(`  Category: ${equipment.category}`);
      console.log(`  Created: ${equipment.created_at}`);
      
      // Check how many bags have this equipment
      const { data: bagCount } = await supabase
        .from('bag_equipment')
        .select('bag_id')
        .eq('equipment_id', equipment.id);
        
      console.log(`  Used in ${bagCount?.length || 0} bags`);
      
      // Get unique bags
      const uniqueBagIds = [...new Set(bagCount?.map(item => item.bag_id) || [])];
      
      if (uniqueBagIds.length > 0) {
        const { data: bags } = await supabase
          .from('user_bags')
          .select(`
            name,
            profiles (
              username
            )
          `)
          .in('id', uniqueBagIds);
          
        console.log('  Bags:');
        bags?.forEach(bag => {
          console.log(`    - ${bag.name} (@${bag.profiles?.username})`);
        });
      }
    }
  }
  
  // Also check if the specific ID from the URL exists
  const urlId = '333eadc3-c508-4ed6-9d05-36e57583b216';
  console.log(`\n=== Checking URL equipment ID: ${urlId} ===`);
  
  const { data: urlEquipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', urlId)
    .single();
    
  if (urlEquipment) {
    console.log('Found equipment:', urlEquipment.brand, urlEquipment.model);
  } else {
    console.log('⚠️  Equipment with this ID does not exist in the database!');
    console.log('This might be a stale URL or the equipment was deleted.');
  }
}

findBRNRMini().catch(console.error);