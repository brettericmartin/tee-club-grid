import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY // Use anon key to test public access
);

async function testEquipmentFetch() {
  console.log('Testing equipment fetch...\n');
  
  // Test basic query
  console.log('1. Testing basic equipment query:');
  const { data: basicData, error: basicError } = await supabase
    .from('equipment')
    .select('*')
    .limit(5);
    
  if (basicError) {
    console.error('Basic query error:', basicError);
  } else {
    console.log(`✓ Found ${basicData?.length} items`);
    console.log('Sample:', basicData?.[0]);
  }
  
  console.log('\n2. Testing with category filter:');
  const { data: driverData, error: driverError } = await supabase
    .from('equipment')
    .select('*')
    .eq('category', 'driver')
    .limit(5);
    
  if (driverError) {
    console.error('Driver query error:', driverError);
  } else {
    console.log(`✓ Found ${driverData?.length} drivers`);
  }
  
  console.log('\n3. Testing sort by price:');
  const { data: priceData, error: priceError } = await supabase
    .from('equipment')
    .select('*')
    .order('msrp', { ascending: true })
    .limit(5);
    
  if (priceError) {
    console.error('Price sort error:', priceError);
  } else {
    console.log(`✓ Sorted by price - lowest: $${priceData?.[0]?.msrp}`);
  }
}

testEquipmentFetch().catch(console.error);