import { supabase } from './supabase-admin.js';

async function clearFakePrices() {
  console.log('🧹 Clearing fake price data...\n');

  const { data, error } = await supabase
    .from('equipment_prices')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

  if (error) {
    console.error('Error clearing prices:', error);
  } else {
    console.log('✅ All fake prices cleared');
  }

  // Verify
  const { count } = await supabase
    .from('equipment_prices')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Remaining prices in database: ${count || 0}`);
}

clearFakePrices().catch(console.error);