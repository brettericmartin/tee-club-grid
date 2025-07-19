import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testShaftGripEquipment() {
  console.log('🧪 Testing shaft and grip equipment functionality...\n');

  try {
    // 1. Get a test user
    console.log('📊 Getting test user...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);

    if (profileError || !profiles?.length) {
      console.error('Error getting test user:', profileError);
      return;
    }

    const userId = profiles[0].id;
    console.log(`Using user: ${profiles[0].username} (${userId})\n`);

    // 2. Get user's bag
    console.log('🎒 Getting user\'s bag...');
    const { data: bags, error: bagError } = await supabase
      .from('user_bags')
      .select('id, name')
      .eq('user_id', userId)
      .limit(1);

    if (bagError || !bags?.length) {
      console.error('Error getting bag:', bagError);
      return;
    }

    const bagId = bags[0].id;
    console.log(`Using bag: ${bags[0].name} (${bagId})\n`);

    // 3. Check for shaft equipment items
    console.log('🔍 Checking shaft equipment items...');
    const { data: shaftEquipment, error: shaftError } = await supabase
      .from('equipment')
      .select('id, brand, model, image_url')
      .eq('category', 'shaft')
      .limit(5);

    if (shaftError) {
      console.error('Error fetching shaft equipment:', shaftError);
      return;
    }

    console.log(`Found ${shaftEquipment?.length || 0} shaft equipment items`);
    shaftEquipment?.forEach(shaft => {
      console.log(`  - ${shaft.brand} ${shaft.model} (${shaft.id})`);
      if (shaft.image_url) {
        console.log(`    ✅ Has image: ${shaft.image_url}`);
      } else {
        console.log(`    ❌ No image`);
      }
    });

    // 4. Check for grip equipment items
    console.log('\n🔍 Checking grip equipment items...');
    const { data: gripEquipment, error: gripError } = await supabase
      .from('equipment')
      .select('id, brand, model, image_url')
      .eq('category', 'grip')
      .limit(5);

    if (gripError) {
      console.error('Error fetching grip equipment:', gripError);
      return;
    }

    console.log(`Found ${gripEquipment?.length || 0} grip equipment items`);
    gripEquipment?.forEach(grip => {
      console.log(`  - ${grip.brand} ${grip.model} (${grip.id})`);
      if (grip.image_url) {
        console.log(`    ✅ Has image: ${grip.image_url}`);
      } else {
        console.log(`    ❌ No image`);
      }
    });

    // 5. Check if any shafts/grips are in the user's bag
    console.log('\n🎒 Checking user\'s bag for shaft/grip equipment...');
    const { data: bagEquipment, error: bagEquipmentError } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        equipment:equipment_id (
          id,
          brand,
          model,
          category,
          image_url
        )
      `)
      .eq('bag_id', bagId)
      .in('equipment.category', ['shaft', 'grip']);

    if (bagEquipmentError) {
      console.error('Error fetching bag equipment:', bagEquipmentError);
      return;
    }

    console.log(`Found ${bagEquipment?.length || 0} shaft/grip items in user's bag`);
    bagEquipment?.forEach(item => {
      if (item.equipment) {
        console.log(`  - ${item.equipment.category}: ${item.equipment.brand} ${item.equipment.model}`);
      }
    });

    // 6. Add a sample shaft to the bag if none exists
    if (!bagEquipment?.find(item => item.equipment?.category === 'shaft') && shaftEquipment?.length > 0) {
      console.log('\n➕ Adding a sample shaft to the bag...');
      const sampleShaft = shaftEquipment[0];
      
      const { error: insertError } = await supabase
        .from('bag_equipment')
        .insert({
          bag_id: bagId,
          equipment_id: sampleShaft.id,
          is_featured: false,
          notes: 'Test shaft equipment item'
        });

      if (insertError) {
        console.error('Error adding shaft to bag:', insertError);
      } else {
        console.log(`✅ Added ${sampleShaft.brand} ${sampleShaft.model} to bag`);
      }
    }

    // 7. Add a sample grip to the bag if none exists
    if (!bagEquipment?.find(item => item.equipment?.category === 'grip') && gripEquipment?.length > 0) {
      console.log('\n➕ Adding a sample grip to the bag...');
      const sampleGrip = gripEquipment[0];
      
      const { error: insertError } = await supabase
        .from('bag_equipment')
        .insert({
          bag_id: bagId,
          equipment_id: sampleGrip.id,
          is_featured: false,
          notes: 'Test grip equipment item'
        });

      if (insertError) {
        console.error('Error adding grip to bag:', insertError);
      } else {
        console.log(`✅ Added ${sampleGrip.brand} ${sampleGrip.model} to bag`);
      }
    }

    console.log('\n✅ Test complete! Shaft and grip equipment items are ready.');
    console.log('💡 Next steps:');
    console.log('1. Upload photos for shaft/grip equipment using the Equipment page');
    console.log('2. View your bag to see shaft/grip items in the accessories section');
    console.log('3. Click on them to see the equipment showcase modal');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testShaftGripEquipment().catch(console.error);