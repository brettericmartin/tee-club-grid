#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getDetailedSchema() {
  console.log('🔍 Getting detailed schema information...\n');

  const tables = ['user_bags', 'bag_equipment', 'profiles', 'feed_posts'];
  
  for (const tableName of tables) {
    console.log(`\n${tableName.toUpperCase()} TABLE SCHEMA:`);
    console.log('=' .repeat(60));
    
    try {
      // Try to query information_schema through supabase
      const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName })
        .catch(async () => {
          // Fallback: Get column info by selecting all columns and examining types
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (sampleError) {
            throw sampleError;
          }
          
          if (sampleData && sampleData.length > 0) {
            const row = sampleData[0];
            return {
              data: Object.keys(row).map(col => ({
                column_name: col,
                data_type: typeof row[col] === 'object' && row[col] !== null ? 'object/json' : typeof row[col],
                is_nullable: row[col] === null ? 'YES' : 'UNKNOWN'
              }))
            };
          } else {
            // Table is empty, try to get structure anyway
            return { data: [] };
          }
        });

      if (error) {
        console.log(`❌ Error getting schema for ${tableName}: ${error.message}`);
        continue;
      }

      if (columns && columns.length > 0) {
        console.log('Columns:');
        columns.forEach(col => {
          console.log(`  📝 ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable}`);
        });
      } else {
        // Fallback method - get actual data and infer types
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          const row = sampleData[0];
          console.log('Columns (inferred from data):');
          Object.entries(row).forEach(([col, value]) => {
            let type = typeof value;
            if (value === null) type = 'null';
            else if (Array.isArray(value)) type = 'array';
            else if (typeof value === 'object') type = 'object/json';
            
            console.log(`  📝 ${col.padEnd(20)} | ${type.padEnd(15)} | Value: ${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}`);
          });
        } else {
          console.log('  📭 Table appears to be empty or inaccessible');
        }
      }
      
    } catch (err) {
      console.log(`❌ Error processing ${tableName}: ${err.message}`);
    }
  }

  // Specific privacy/visibility checks
  console.log('\n\nPRIVACY/VISIBILITY COLUMNS CHECK:');
  console.log('=' .repeat(60));
  
  const privacyChecks = [
    { table: 'user_bags', columns: ['is_public', 'visibility', 'privacy_level'] },
    { table: 'profiles', columns: ['is_public', 'visibility', 'privacy_level'] },
    { table: 'feed_posts', columns: ['is_public', 'visibility', 'privacy_level'] }
  ];
  
  for (const check of privacyChecks) {
    console.log(`\n${check.table}:`);
    
    const { data: sampleData, error } = await supabase
      .from(check.table)
      .select('*')
      .limit(1);
    
    if (!error && sampleData && sampleData.length > 0) {
      const availableColumns = Object.keys(sampleData[0]);
      check.columns.forEach(col => {
        if (availableColumns.includes(col)) {
          console.log(`  ✅ ${col} - EXISTS`);
        } else {
          console.log(`  ❌ ${col} - DOES NOT EXIST`);
        }
      });
      
      console.log(`  📋 Available columns: ${availableColumns.join(', ')}`);
    } else {
      console.log(`  ❌ Could not check columns: ${error?.message || 'No data'}`);
    }
  }
}

// Run the detailed schema check
getDetailedSchema()
  .then(() => {
    console.log('\n✨ Detailed schema check complete!');
  })
  .catch(error => {
    console.error('\n❌ Schema check failed:', error);
  });