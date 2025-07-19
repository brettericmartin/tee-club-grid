import { supabase } from './supabase-admin.js';

async function checkEquipmentSaves() {
  console.log('Checking equipment_saves table...\n');

  try {
    // 1. Check if table exists and get structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('equipment_saves')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing equipment_saves table:', tableError);
      return;
    }

    console.log('✅ equipment_saves table exists');

    // 2. Count total saves
    const { count, error: countError } = await supabase
      .from('equipment_saves')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting saves:', countError);
    } else {
      console.log(`📊 Total equipment saves: ${count}`);
    }

    // 3. Get sample saves with equipment data
    const { data: saves, error: savesError } = await supabase
      .from('equipment_saves')
      .select(`
        *,
        equipment:equipment_id (
          id,
          brand,
          model,
          category
        )
      `)
      .limit(5);

    if (savesError) {
      console.error('❌ Error fetching saves with equipment:', savesError);
    } else {
      console.log(`\n📋 Sample saves (${saves?.length || 0} shown):`);
      saves?.forEach(save => {
        console.log(`  - User: ${save.user_id.substring(0, 8)}...`);
        console.log(`    Equipment: ${save.equipment?.brand} ${save.equipment?.model}`);
        console.log(`    Saved at: ${new Date(save.created_at).toLocaleString()}`);
      });
    }

    // 4. Check RLS policies
    console.log('\n🔐 Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase.rpc(
      'get_policies_for_table',
      { table_name: 'equipment_saves' }
    ).single();

    if (policyError) {
      console.log('   Could not check policies (function may not exist)');
    } else {
      console.log('   Policies found:', policies);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkEquipmentSaves();