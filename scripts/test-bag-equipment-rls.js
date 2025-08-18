import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function testBagEquipmentRLS() {
  console.log('🔍 Testing bag_equipment table with custom_specs column...\n');

  try {
    // Test 1: Basic select query
    console.log('1️⃣ Testing basic SELECT on bag_equipment...');
    const { data: basicData, error: basicError } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(3);

    if (basicError) {
      console.error('❌ Basic select failed:', basicError.message);
      console.error('Full error:', basicError);
    } else {
      console.log('✅ Basic select successful. Rows returned:', basicData?.length || 0);
      if (basicData && basicData.length > 0) {
        console.log('Columns in result:', Object.keys(basicData[0]));
      }
    }

    // Test 2: Select with custom_specs explicitly
    console.log('\n2️⃣ Testing SELECT with custom_specs column...');
    const { data: customData, error: customError } = await supabase
      .from('bag_equipment')
      .select('id, bag_id, equipment_id, position, is_featured, custom_specs')
      .limit(3);

    if (customError) {
      console.error('❌ Select with custom_specs failed:', customError.message);
    } else {
      console.log('✅ Select with custom_specs successful');
      if (customData && customData.length > 0) {
        console.log('Sample custom_specs values:');
        customData.forEach(row => {
          console.log(`  - ID ${row.id}: ${JSON.stringify(row.custom_specs)}`);
        });
      }
    }

    // Test 3: Test joined queries (like what the app uses)
    console.log('\n3️⃣ Testing joined query with equipment table...');
    const { data: joinData, error: joinError } = await supabase
      .from('bag_equipment')
      .select(`
        *,
        equipment:equipment_id (
          id,
          brand,
          model,
          category
        )
      `)
      .limit(3);

    if (joinError) {
      console.error('❌ Joined query failed:', joinError.message);
      console.error('This might be causing the loading issues!');
    } else {
      console.log('✅ Joined query successful');
    }

    // Test 4: Check RLS policies
    console.log('\n4️⃣ Checking RLS policies on bag_equipment...');
    
    // Try as authenticated user (using service role bypasses RLS)
    // Let's test what a normal user would see
    const { data: userData, error: userError } = await supabase
      .from('user_bags')
      .select('*, bag_equipment(*)')
      .limit(1);

    if (userError) {
      console.error('❌ User bags with equipment query failed:', userError.message);
      console.error('This is likely the root cause of loading issues!');
    } else {
      console.log('✅ User bags with equipment query successful');
    }

    // Test 5: Check if we can insert with custom_specs
    console.log('\n5️⃣ Testing INSERT with custom_specs...');
    const testData = {
      bag_id: 'test-bag-id',
      equipment_id: 'test-equipment-id',
      position: 1,
      is_featured: false,
      custom_specs: { loft: '10.5', shaft: 'regular' }
    };
    
    console.log('Would insert:', testData);
    console.log('(Not actually inserting to avoid test data in production)');

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  console.log('\n📊 Summary:');
  console.log('If any of the above tests failed, it could explain why pages aren\'t loading.');
  console.log('The most likely issue is RLS policies need to be updated to include the new column.');
}

testBagEquipmentRLS();