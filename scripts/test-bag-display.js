import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBagDisplay() {
  console.log('\n🏌️ Testing Bag Display Data\n');
  console.log('==========================\n');

  // Get a sample bag
  const { data: bags, error: bagsError } = await supabase
    .from('user_bags')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        handicap
      )
    `)
    .limit(1);

  if (bagsError) {
    console.error('Error fetching bags:', bagsError);
    return;
  }

  if (!bags || bags.length === 0) {
    console.log('No bags found. Please create some bags first.');
    return;
  }

  const bag = bags[0];
  console.log('Sample Bag:');
  console.log('- ID:', bag.id);
  console.log('- Name:', bag.name);
  console.log('- Owner:', bag.profiles?.username || 'Unknown');
  console.log('- URL path would be: /bag/' + bag.id);

  // Get equipment for this bag
  const { data: equipment, error: equipError } = await supabase
    .from('bag_equipment')
    .select(`
      *,
      equipment (
        id,
        brand,
        model,
        category,
        image_url,
        msrp
      )
    `)
    .eq('bag_id', bag.id)
    .limit(5);

  if (equipError) {
    console.error('\nError fetching equipment:', equipError);
  } else {
    console.log(`\nEquipment (${equipment?.length || 0} items):`);
    equipment?.forEach(item => {
      console.log(`- ${item.equipment.brand} ${item.equipment.model} (${item.equipment.category})`);
    });
  }

  console.log('\n✅ This bag should be viewable at:');
  console.log(`   http://localhost:5173/bag/${bag.id}`);
  
  console.log('\n==========================\n');
}

testBagDisplay().catch(console.error);