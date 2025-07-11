import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBags() {
  console.log('\n🏌️ Checking Bags Data\n');
  console.log('===================\n');

  // Check bags table
  const { data: bags, error: bagsError } = await supabase
    .from('bags')
    .select('*')
    .limit(5);

  if (bagsError) {
    console.error('Error fetching bags:', bagsError);
    return;
  }

  console.log(`Found ${bags?.length || 0} bags in database\n`);
  
  if (bags && bags.length > 0) {
    console.log('Sample bag:');
    console.log(JSON.stringify(bags[0], null, 2));
    
    // Check bag_equipment for first bag
    const { data: equipment, error: equipError } = await supabase
      .from('bag_equipment')
      .select(`
        *,
        equipment (
          brand,
          model,
          category
        )
      `)
      .eq('bag_id', bags[0].id)
      .limit(5);
      
    console.log(`\nBag "${bags[0].name}" has ${equipment?.length || 0} equipment items`);
    
    if (equipment && equipment.length > 0) {
      console.log('\nSample equipment:');
      equipment.forEach(item => {
        console.log(`- ${item.equipment.brand} ${item.equipment.model} (${item.equipment.category})`);
      });
    }
  } else {
    console.log('No bags found. Creating sample data...\n');
    
    // Get first user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
      
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      console.log(`Creating bag for user: ${profiles[0].username}\n`);
      
      // Create a sample bag
      const { data: newBag, error: createError } = await supabase
        .from('bags')
        .insert({
          user_id: userId,
          name: 'My Pro Setup 2024',
          description: 'Tournament ready bag with latest equipment',
          is_public: true
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating bag:', createError);
      } else {
        console.log('✅ Created bag:', newBag.name);
        console.log('Bag ID:', newBag.id);
        
        // Add some equipment
        const { data: equipment } = await supabase
          .from('equipment')
          .select('id')
          .in('category', ['driver', 'putter', 'ball'])
          .limit(3);
          
        if (equipment && equipment.length > 0) {
          const bagEquipment = equipment.map((item, index) => ({
            bag_id: newBag.id,
            equipment_id: item.id,
            is_featured: index === 0
          }));
          
          const { error: equipError } = await supabase
            .from('bag_equipment')
            .insert(bagEquipment);
            
          if (equipError) {
            console.error('Error adding equipment:', equipError);
          } else {
            console.log(`✅ Added ${equipment.length} items to bag`);
          }
        }
      }
    }
  }
  
  console.log('\n===================\n');
}

checkBags().catch(console.error);