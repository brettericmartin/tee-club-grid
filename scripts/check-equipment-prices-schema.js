import { supabase } from './supabase-admin.js';

async function checkSchema() {
  console.log('🔍 Checking equipment_prices table schema...\n');

  // Try to fetch with all potential columns to see which ones work
  const testQueries = [
    'id',
    'equipment_id', 
    'retailer',
    'price',
    'sale_price',
    'url',
    'in_stock',
    'created_at',
    'currency',
    'condition',
    'affiliate_url',
    'last_updated',
    'is_active'
  ];

  const workingColumns = [];
  
  for (const column of testQueries) {
    const { error } = await supabase
      .from('equipment_prices')
      .select(column)
      .limit(1);
    
    if (!error) {
      workingColumns.push(column);
      console.log(`✅ ${column}`);
    } else {
      console.log(`❌ ${column} - not found`);
    }
  }

  console.log('\n📋 Available columns:', workingColumns.join(', '));
  
  // Now let's insert with only the columns that exist
  if (workingColumns.includes('equipment_id')) {
    await insertSampleWithAvailableColumns(workingColumns);
  }
}

async function insertSampleWithAvailableColumns(columns) {
  console.log('\n📝 Inserting sample price with available columns...');
  
  // Get sample equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .limit(1)
    .single();

  if (!equipment) {
    console.log('No equipment found');
    return;
  }

  // Build price object with only available columns
  const priceData = {};
  
  if (columns.includes('equipment_id')) priceData.equipment_id = equipment.id;
  if (columns.includes('retailer')) priceData.retailer = 'Amazon';
  if (columns.includes('price')) priceData.price = 299.99;
  if (columns.includes('sale_price')) priceData.sale_price = 249.99;
  if (columns.includes('url')) priceData.url = 'https://amazon.com/example';
  if (columns.includes('in_stock')) priceData.in_stock = true;
  if (columns.includes('currency')) priceData.currency = 'USD';
  if (columns.includes('is_active')) priceData.is_active = true;

  console.log('Inserting:', priceData);

  const { data, error } = await supabase
    .from('equipment_prices')
    .insert(priceData)
    .select();

  if (error) {
    console.error('❌ Insert failed:', error.message);
  } else {
    console.log('✅ Successfully inserted price!');
    console.log('Data:', data[0]);
  }
}

checkSchema().catch(console.error);