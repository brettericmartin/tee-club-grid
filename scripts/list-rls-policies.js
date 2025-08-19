#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function listRLSPolicies() {
  
  console.log('🔍 Checking RLS policies for all relevant tables...\n');
  
  const tables = [
    'feed_posts', 'feed_likes', 'profiles', 'user_follows', 
    'equipment', 'equipment_photos', 'user_bags', 'bag_equipment',
    'equipment_saves', 'equipment_tees', 'bag_tees', 'feed_comments',
    'equipment_reviews'
  ];
  
  try {
    // First, check which tables exist
    console.log('📋 Checking which tables exist...');
    const { data: existingTables, error: tablesError } = await supabase
      .rpc('get_table_list');
    
    if (tablesError) {
      // Alternative query if RPC doesn't exist
      const { data: tableCheck, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', tables);
      
      if (altError) {
        console.error('❌ Error checking tables:', altError);
        return;
      }
      
      console.log('Existing tables:', tableCheck.map(t => t.table_name));
    }
    
    // Get RLS status for each table
    console.log('\n🔐 Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select(`
        relname,
        relrowsecurity
      `)
      .in('relname', tables);
    
    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError);
    } else {
      console.log('RLS Status:');
      rlsStatus.forEach(table => {
        console.log(`  ${table.relname}: ${table.relrowsecurity ? 'ENABLED' : 'DISABLED'}`);
      });
    }
    
    // Get all policies for these tables
    console.log('\n📜 Getting all RLS policies...');
    
    // Query pg_policies system view
    const policyQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = ANY($1)
      ORDER BY tablename, policyname
    `;
    
    const { data: policies, error: policyError } = await supabase
      .rpc('execute_sql', { 
        query: policyQuery,
        params: [tables]
      });
    
    if (policyError) {
      // Try direct query approach
      console.log('Trying alternative policy query...');
      
      const directQuery = `
        SELECT 
          t.table_name,
          CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_enabled
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public'
          AND t.table_name IN (${tables.map((_, i) => `$${i + 1}`).join(', ')})
        ORDER BY t.table_name
      `;
      
      // For now, let's use a simpler approach and check individual tables
      for (const tableName of tables) {
        console.log(`\n🔍 Checking policies for table: ${tableName}`);
        
        try {
          // Try to select from the table to see if it exists
          const { data: testSelect, error: testError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (testError && testError.code === '42P01') {
            console.log(`  ❌ Table ${tableName} does not exist`);
            continue;
          }
          
          console.log(`  ✅ Table ${tableName} exists`);
          
          // Note: We can't directly query pg_policies without elevated permissions
          // So we'll list what we know from the codebase analysis
          
        } catch (err) {
          console.log(`  ❓ Error checking ${tableName}:`, err.message);
        }
      }
      
    } else {
      console.log('\n📋 RLS Policies Found:');
      
      if (policies && policies.length > 0) {
        let currentTable = '';
        policies.forEach(policy => {
          if (policy.tablename !== currentTable) {
            currentTable = policy.tablename;
            console.log(`\n🔸 Table: ${policy.tablename}`);
            console.log('  Policies:');
          }
          
          console.log(`    - Name: ${policy.policyname}`);
          console.log(`      Command: ${policy.cmd}`);
          console.log(`      Permissive: ${policy.permissive}`);
          console.log(`      Roles: ${policy.roles}`);
          if (policy.qual) console.log(`      Qual: ${policy.qual}`);
          if (policy.with_check) console.log(`      With Check: ${policy.with_check}`);
          console.log('');
        });
      } else {
        console.log('No RLS policies found for the specified tables.');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n✨ RLS policy check complete!');
}

// Run the function
listRLSPolicies().catch(console.error);