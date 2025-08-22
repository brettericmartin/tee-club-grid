#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getTableSchema(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} SCHEMA ===`);
  
  try {
    // Try to get a sample row to understand structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log('❌ Table does not exist or no access:', sampleError.message);
      
      // Try to get schema info by attempting an insert
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({})
        .select();
      
      if (insertError) {
        console.log('📋 Schema info from constraint violations:');
        console.log(`   ${insertError.message}`);
        
        // Extract column names from the error message
        if (insertError.message.includes('violates not-null constraint')) {
          const match = insertError.message.match(/column "([^"]+)"/);
          if (match) {
            console.log(`   - ${match[1]}: (required field)`);
          }
        }
      }
      
      return null;
    }
    
    if (sampleData && sampleData.length > 0) {
      console.log('📋 Columns (from sample data):');
      Object.keys(sampleData[0]).forEach(column => {
        const value = sampleData[0][column];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${column}: ${type}`);
      });
      
      return Object.keys(sampleData[0]);
    } else {
      console.log('📋 Table exists but is empty');
      
      // Try to get column info by attempting an insert
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({})
        .select();
      
      if (insertError) {
        console.log('📋 Schema info from constraint violations:');
        console.log(`   ${insertError.message}`);
      }
      
      return [];
    }
  } catch (error) {
    console.log('❌ Schema check failed:', error.message);
    return null;
  }
}

async function getRLSPolicies(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} RLS POLICIES ===`);
  
  try {
    // Try to query the table to see if RLS blocks us
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('policy')) {
      console.log('🔒 RLS policies are active (access denied by policy)');
      console.log(`   Error: ${error.message}`);
    } else if (error) {
      console.log('❌ Error accessing table:', error.message);
    } else {
      console.log('✅ Table accessible (no blocking RLS policies or policies allow access)');
    }
  } catch (error) {
    console.log('❌ RLS check failed:', error.message);
  }
}

async function testTableAccess(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} ACCESS TEST ===`);
  
  try {
    // Test read access
    const { data: readData, error: readError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (readError) {
      console.log('❌ Read access failed:', readError.message);
    } else {
      console.log('✅ Read access works');
      console.log(`📊 Row count: ${readData.length}`);
    }
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Count query failed:', countError.message);
    } else {
      console.log(`📊 Total rows: ${count}`);
    }
    
  } catch (error) {
    console.log('❌ Access test failed:', error.message);
  }
}

async function checkRLSEnabled(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} RLS STATUS ===`);
  
  try {
    // Try to get RLS status info (simplified check)
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error && error.message.includes('policy')) {
      console.log('🔒 RLS is ENABLED (policies are enforced)');
    } else if (error) {
      console.log(`❌ Error checking table: ${error.message}`);
    } else {
      console.log('ℹ️  RLS status unclear or not enforced for this operation');
    }
    
  } catch (error) {
    console.log('❌ RLS status check failed:', error.message);
  }
}

async function main() {
  console.log('🔍 COMPREHENSIVE AFFILIATE VIDEO FEATURES CHECK');
  console.log('===============================================');
  
  const tables = [
    'user_equipment_links',
    'equipment_videos',
    'user_bag_videos',
    'link_clicks'
  ];
  
  for (const table of tables) {
    console.log(`\n\n🏆 CHECKING TABLE: ${table}`);
    console.log('='.repeat(50));
    
    await getTableSchema(table);
    await checkRLSEnabled(table);
    await getRLSPolicies(table);
    await testTableAccess(table);
  }
  
  console.log('\n\n🎯 FUNCTIONALITY TESTS');
  console.log('='.repeat(50));
  
  // Test sample data and constraints
  console.log('\n=== DATA INTEGRITY TEST ===');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Count check for ${table} failed:`, error.message);
      } else {
        console.log(`✅ ${table} has ${count} rows`);
      }
    } catch (error) {
      console.log(`❌ Data integrity test for ${table} failed:`, error.message);
    }
  }
  
  console.log('\n\n✨ Comprehensive check complete!');
}

main().catch(console.error);