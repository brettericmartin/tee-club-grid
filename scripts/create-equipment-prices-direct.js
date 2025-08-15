import { supabase } from './supabase-admin.js';

async function createEquipmentPricesTable() {
  console.log('🔨 Creating equipment_prices table directly...\n');

  try {
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('equipment_prices')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table equipment_prices already exists!');
      
      // Get count of existing prices
      const { count } = await supabase
        .from('equipment_prices')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Current price records: ${count || 0}`);
      return true;
    }

    console.log('Table does not exist yet. Would need to be created via Supabase dashboard.');
    console.log('\nTo create the table:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from: sql/create-equipment-prices.sql');
    
    return false;
  } catch (error) {
    console.error('Error checking table:', error);
    return false;
  }
}

async function testPriceInsertion() {
  console.log('\n🧪 Testing price insertion with minimal data...');
  
  // Get a sample equipment item
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .limit(1)
    .single();

  if (equipError || !equipment) {
    console.error('Could not fetch sample equipment');
    return;
  }

  console.log(`\nUsing equipment: ${equipment.brand} ${equipment.model}`);

  // Try inserting a simple price record
  const testPrice = {
    equipment_id: equipment.id,
    retailer: 'test-retailer',
    price: 299.99,
    sale_price: 249.99,
    currency: 'USD',
    url: 'https://example.com/product',
    in_stock: true,
    condition: 'new',
    is_active: true
  };

  const { data, error } = await supabase
    .from('equipment_prices')
    .insert(testPrice)
    .select();

  if (error) {
    console.error('❌ Could not insert price:', error.message);
    if (error.code === '42P01') {
      console.log('\n⚠️  Table does not exist. Please create it first using the SQL file.');
    }
  } else {
    console.log('✅ Successfully inserted test price!');
    console.log('Price ID:', data[0].id);
    
    // Clean up test data
    await supabase
      .from('equipment_prices')
      .delete()
      .eq('retailer', 'test-retailer');
    console.log('🧹 Cleaned up test data');
  }
}

// Run the checks
async function main() {
  const tableExists = await createEquipmentPricesTable();
  
  if (tableExists) {
    await testPriceInsertion();
  }
}

main().catch(console.error);