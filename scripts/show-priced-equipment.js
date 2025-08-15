import { supabase } from './supabase-admin.js';

async function showPricedEquipment() {
  console.log('🏷️  Equipment with prices:\n');

  const { data: equipment, error } = await supabase
    .from('equipment_prices')
    .select(`
      equipment_id,
      equipment:equipment_id (
        id,
        brand,
        model,
        category
      )
    `)
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get unique equipment
  const uniqueEquipment = {};
  equipment?.forEach(item => {
    if (item.equipment) {
      uniqueEquipment[item.equipment.id] = item.equipment;
    }
  });

  Object.values(uniqueEquipment).forEach(eq => {
    console.log(`📍 ${eq.brand} ${eq.model}`);
    console.log(`   Category: ${eq.category}`);
    console.log(`   URL: http://localhost:3333/equipment/${eq.id}`);
    console.log('');
  });

  // Show a direct link to one
  const firstId = Object.keys(uniqueEquipment)[0];
  if (firstId) {
    console.log(`\n🔗 Quick link to see prices:`);
    console.log(`   http://localhost:3333/equipment/${firstId}`);
  }
}

showPricedEquipment().catch(console.error);