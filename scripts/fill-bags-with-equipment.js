import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Equipment categories to fill (matching database values)
const CATEGORIES = [
  'driver',
  'fairway_wood',
  'hybrid',
  'iron',
  'wedge',
  'putter',
  'ball',
  'bag',
  'glove',
  'rangefinder',
  'gps'
];

async function getTopEquipmentByCategory() {
  console.log('Getting top equipment for each category...');
  const topEquipment = {};

  for (const category of CATEGORIES) {
    // Get equipment sorted by saves count
    const { data: categoryEquipment, error } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_saves!inner(count)
      `)
      .eq('category', category)
      .order('equipment_saves.count', { ascending: false })
      .limit(1);

    if (error) {
      // If no saves data, just get any equipment from this category
      const { data: fallbackEquipment } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', category)
        .limit(1);
      
      if (fallbackEquipment && fallbackEquipment.length > 0) {
        topEquipment[category] = fallbackEquipment[0];
        console.log(`✓ ${category}: ${fallbackEquipment[0].brand} ${fallbackEquipment[0].model}`);
      } else {
        console.log(`✗ ${category}: No equipment found`);
      }
    } else if (categoryEquipment && categoryEquipment.length > 0) {
      topEquipment[category] = categoryEquipment[0];
      console.log(`✓ ${category}: ${categoryEquipment[0].brand} ${categoryEquipment[0].model}`);
    }
  }

  return topEquipment;
}

async function fillBagsWithEquipment() {
  try {
    // Get all user bags
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select('id, name, user_id');

    if (bagsError) {
      console.error('Error fetching bags:', bagsError);
      return;
    }

    console.log(`Found ${bags.length} bags to fill`);

    // Get top equipment for each category
    const topEquipment = await getTopEquipmentByCategory();
    const equipmentToAdd = Object.values(topEquipment);

    if (equipmentToAdd.length === 0) {
      console.error('No equipment found to add');
      return;
    }

    // Process each bag
    for (const bag of bags) {
      console.log(`\nProcessing bag: ${bag.name} (${bag.id})`);

      // Check existing equipment in this bag
      const { data: existingEquipment } = await supabase
        .from('bag_equipment')
        .select('equipment_id')
        .eq('bag_id', bag.id);

      const existingIds = new Set(existingEquipment?.map(e => e.equipment_id) || []);

      // Add equipment that doesn't already exist in the bag
      const toAdd = equipmentToAdd.filter(eq => !existingIds.has(eq.id));
      
      if (toAdd.length === 0) {
        console.log('  → Bag already has equipment from all categories');
        continue;
      }

      const bagEquipmentData = toAdd.map(equipment => ({
        bag_id: bag.id,
        equipment_id: equipment.id,
        condition: 'new',
        is_featured: false
      }));

      const { error: insertError } = await supabase
        .from('bag_equipment')
        .insert(bagEquipmentData);

      if (insertError) {
        console.error(`  ✗ Error adding equipment to bag ${bag.id}:`, insertError);
      } else {
        console.log(`  ✓ Added ${toAdd.length} items to bag`);
      }
    }

    console.log('\n✅ Done filling bags with equipment!');
  } catch (error) {
    console.error('Error in fillBagsWithEquipment:', error);
  }
}

// Run the script
console.log('Starting to fill bags with equipment...\n');
fillBagsWithEquipment();