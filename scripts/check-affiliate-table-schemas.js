import { supabase } from './supabase-admin.js';

async function checkTableSchemas() {
  const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
  
  console.log('Checking table schemas for affiliate video tables...\n');
  
  for (const tableName of tables) {
    console.log(`\n=== ${tableName.toUpperCase()} ===`);
    
    try {
      // Get column information
      const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
        table_name: tableName
      });
      
      if (columnsError) {
        // Fallback: try to get a sample row to see structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.log(`❌ Table '${tableName}' not found or no access`);
          console.log(`Error: ${sampleError.message}`);
          continue;
        }
        
        if (sampleData && sampleData.length > 0) {
          console.log('✅ Table exists. Columns from sample data:');
          Object.keys(sampleData[0]).forEach(column => {
            console.log(`  - ${column}: ${typeof sampleData[0][column]}`);
          });
        } else {
          console.log('✅ Table exists but is empty. Attempting to describe structure...');
          
          // Try inserting and rolling back to get structure
          const { error: insertError } = await supabase
            .from(tableName)
            .insert({})
            .select();
          
          if (insertError) {
            console.log(`Structure info from insert error: ${insertError.message}`);
          }
        }
      } else {
        console.log('✅ Table exists. Columns:');
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
      }
      
      // Check if RLS is enabled
      const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {
        table_name: tableName
      });
      
      if (!rlsError && rlsStatus) {
        console.log(`RLS Status: ${rlsStatus.enabled ? 'ENABLED' : 'DISABLED'}`);
      }
      
      // Get current row count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`Row count: ${count}`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking table '${tableName}': ${error.message}`);
    }
  }
  
  // Check existing RLS policies
  console.log('\n=== EXISTING RLS POLICIES ===');
  try {
    const { data: policies, error: policiesError } = await supabase.rpc('get_rls_policies', {});
    
    if (policiesError) {
      console.log('Could not fetch RLS policies directly. Checking manually...');
      
      for (const tableName of tables) {
        console.log(`\nPolicies for ${tableName}:`);
        // This will show us what policies exist by trying basic operations
        const { error: selectError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (selectError && selectError.message.includes('policy')) {
          console.log(`  Has RLS policies (access denied): ${selectError.message}`);
        } else if (selectError) {
          console.log(`  Error: ${selectError.message}`);
        } else {
          console.log(`  No restricting RLS policies or table accessible`);
        }
      }
    } else {
      policies
        .filter(policy => tables.includes(policy.tablename))
        .forEach(policy => {
          console.log(`${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
        });
    }
  } catch (error) {
    console.log(`Error checking RLS policies: ${error.message}`);
  }
}

checkTableSchemas().catch(console.error);