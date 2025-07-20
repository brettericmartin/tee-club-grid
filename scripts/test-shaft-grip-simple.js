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

async function testShaftGripSimple() {
  console.log('🧪 Testing shaft/grip integration...\n');

  try {
    // First get a bag with shaft/grip customizations
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select('id, equipment_id, shaft_id, grip_id')
      .or('shaft_id.not.is.null,grip_id.not.is.null')
      .limit(5);

    if (bagError) {
      console.error('Error fetching bag equipment:', bagError);
      return;
    }

    console.log(`Found ${bagEquipment?.length || 0} items with shaft/grip customizations`);
    console.log('Raw data:', JSON.stringify(bagEquipment, null, 2), '\n');

    // For each item, manually fetch the related data
    for (const item of bagEquipment || []) {
      console.log(`📦 Bag Equipment ID: ${item.id}`);
      
      // Fetch main equipment
      const { data: equipment } = await supabase
        .from('equipment')
        .select('brand, model, category')
        .eq('id', item.equipment_id)
        .single();
      
      if (equipment) {
        console.log(`   Club: ${equipment.brand} ${equipment.model} (${equipment.category})`);
      }
      
      // Fetch shaft if exists
      if (item.shaft_id) {
        const { data: shaft } = await supabase
          .from('equipment')
          .select('brand, model, specs')
          .eq('id', item.shaft_id)
          .single();
        
        if (shaft) {
          console.log(`   🏌️ Shaft: ${shaft.brand} ${shaft.model}`);
          if (shaft.specs) {
            console.log(`      - Flex: ${shaft.specs.flex || 'N/A'}`);
            console.log(`      - Weight: ${shaft.specs.weight || 'N/A'}g`);
          }
        }
      }
      
      // Fetch grip if exists
      if (item.grip_id) {
        const { data: grip } = await supabase
          .from('equipment')
          .select('brand, model, specs')
          .eq('id', item.grip_id)
          .single();
        
        if (grip) {
          console.log(`   🤲 Grip: ${grip.brand} ${grip.model}`);
          if (grip.specs) {
            console.log(`      - Size: ${grip.specs.size || 'N/A'}`);
            console.log(`      - Color: ${grip.specs.color || 'N/A'}`);
          }
        }
      }
      
      console.log('');
    }

    // Test that equipment table has shaft/grip items
    const { count: shaftCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'shaft');

    const { count: gripCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'grip');

    console.log('✅ Summary:');
    console.log(`   - Total shafts in equipment table: ${shaftCount || 0}`);
    console.log(`   - Total grips in equipment table: ${gripCount || 0}`);
    console.log(`   - Bag equipment items with customizations: ${bagEquipment?.length || 0}`);

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testShaftGripSimple();