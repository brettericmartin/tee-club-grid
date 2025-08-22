import { supabase } from './supabase-admin.js';

async function getExactTableSchemas() {
  const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
  
  console.log('Getting exact table schemas using information_schema...\n');
  
  for (const tableName of tables) {
    console.log(`\n=== ${tableName.toUpperCase()} ===`);
    
    try {
      // Use raw SQL to get column information
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
      
      if (error) {
        console.log(`❌ Error getting schema for '${tableName}': ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log('✅ Columns:');
        data.forEach(col => {
          let info = `  - ${col.column_name}: ${col.data_type}`;
          if (col.character_maximum_length) {
            info += `(${col.character_maximum_length})`;
          }
          if (col.is_nullable === 'NO') {
            info += ' NOT NULL';
          }
          if (col.column_default) {
            info += ` DEFAULT ${col.column_default}`;
          }
          console.log(info);
        });
      } else {
        console.log(`❌ No column information found for '${tableName}'`);
      }
      
      // Check RLS status
      const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = '${tableName}' 
            AND schemaname = 'public';
        `
      });
      
      if (!rlsError && rlsData && rlsData.length > 0) {
        console.log(`RLS Status: ${rlsData[0].rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking table '${tableName}': ${error.message}`);
    }
  }
  
  // Get existing policies
  console.log('\n=== CHECKING EXISTING RLS POLICIES ===');
  
  try {
    const { data: policies, error: policiesError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual
        FROM pg_policies 
        WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks')
        ORDER BY tablename, policyname;
      `
    });
    
    if (policiesError) {
      console.log(`❌ Error fetching policies: ${policiesError.message}`);
    } else if (policies && policies.length > 0) {
      console.log('Current RLS Policies:');
      policies.forEach(policy => {
        console.log(`\n${policy.tablename}.${policy.policyname}:`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles}`);
        console.log(`  Condition: ${policy.qual}`);
      });
    } else {
      console.log('No RLS policies found for these tables.');
    }
  } catch (error) {
    console.log(`❌ Error checking policies: ${error.message}`);
  }
}

getExactTableSchemas().catch(console.error);