import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testShaftGripDisplay() {
  console.log('🧪 Testing shaft/grip display functionality...\n');

  try {
    // Find a bag with shaft/grip customizations
    const { data: bagEquipment, error } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        equipment:equipment_id (
          brand,
          model,
          category
        ),
        shaft:equipment!shaft_id (
          brand,
          model,
          category,
          specs
        ),
        grip:equipment!grip_id (
          brand,
          model,
          category,
          specs
        )
      `)
      .not('shaft_id', 'is', null)
      .limit(5);

    if (error) {
      console.error('Error fetching bag equipment:', error);
      return;
    }

    if (!bagEquipment || bagEquipment.length === 0) {
      console.log('No bag equipment with shaft customizations found.');
      return;
    }

    console.log(`Found ${bagEquipment.length} items with shaft/grip customizations:\n`);

    bagEquipment.forEach((item, index) => {
      console.log(`📦 Item ${index + 1}:`);
      console.log(`   Club: ${item.equipment.brand} ${item.equipment.model}`);
      
      if (item.shaft) {
        console.log(`   🏌️ Shaft: ${item.shaft.brand} ${item.shaft.model}`);
        if (item.shaft.specs) {
          console.log(`      - Flex: ${item.shaft.specs.flex || 'N/A'}`);
          console.log(`      - Weight: ${item.shaft.specs.weight || 'N/A'}g`);
        }
      }
      
      if (item.grip) {
        console.log(`   🤲 Grip: ${item.grip.brand} ${item.grip.model}`);
        if (item.grip.specs) {
          console.log(`      - Size: ${item.grip.specs.size || 'N/A'}`);
          console.log(`      - Color: ${item.grip.specs.color || 'N/A'}`);
        }
      }
      
      console.log('');
    });

    // Test that the categories are correct
    console.log('✅ Verification:');
    const shaftItems = bagEquipment.filter(item => item.shaft);
    const gripItems = bagEquipment.filter(item => item.grip);
    
    console.log(`   - Items with shafts: ${shaftItems.length}`);
    console.log(`   - All shafts have category 'shaft': ${shaftItems.every(item => item.shaft.category === 'shaft')}`);
    console.log(`   - Items with grips: ${gripItems.length}`);
    console.log(`   - All grips have category 'grip': ${gripItems.every(item => item.grip?.category === 'grip')}`);

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testShaftGripDisplay();