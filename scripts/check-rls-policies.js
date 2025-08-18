#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🔒 CHECKING RLS POLICIES - The Real Issue');
console.log('==========================================\n');

async function checkRLSPolicies() {
  try {
    console.log('1. CHECKING IF RLS IS ENABLED...\n');
    
    const tables = ['profiles', 'equipment', 'user_bags', 'bag_equipment', 'equipment_photos'];
    
    for (const table of tables) {
      try {
        // Check if RLS is enabled using pg_class
        const { data, error } = await supabase.rpc('execute_sql', {
          query: `
            SELECT 
              relname as table_name,
              relrowsecurity as rls_enabled,
              relforcerowsecurity as rls_forced
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' 
            AND c.relname = '${table}'
            AND c.relkind = 'r';
          `
        });
        
        if (error) {
          console.log(`❌ Cannot check RLS for ${table}: ${error.message}`);
        } else if (data && data.length > 0) {
          const tableInfo = data[0];
          console.log(`Table: ${table}`);
          console.log(`  RLS Enabled: ${tableInfo.rls_enabled ? '✅ YES' : '❌ NO'}`);
          console.log(`  RLS Forced: ${tableInfo.rls_forced ? '⚠️ YES' : '✅ NO'}`);
          
          if (tableInfo.rls_enabled) {
            // Get policies for this table
            const { data: policies, error: policyError } = await supabase.rpc('execute_sql', {
              query: `
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
                WHERE tablename = '${table}' AND schemaname = 'public';
              `
            });
            
            if (policyError) {
              console.log(`  ❌ Cannot get policies: ${policyError.message}`);
            } else if (policies && policies.length > 0) {
              console.log(`  📋 Policies (${policies.length}):`);
              policies.forEach(policy => {
                console.log(`    - ${policy.policyname}: ${policy.cmd} for [${policy.roles}]`);
                if (policy.qual) {
                  console.log(`      WHERE: ${policy.qual}`);
                }
              });
            } else {
              console.log(`  ⚠️ NO POLICIES FOUND - This will block all access!`);
            }
          }
        } else {
          console.log(`❌ Table ${table} not found`);
        }
        console.log('');
      } catch (e) {
        console.log(`❌ Error checking ${table}: ${e.message}\n`);
      }
    }

    console.log('\n2. TESTING WITH DIFFERENT USER CONTEXTS...\n');
    
    // Test as anon user (what the frontend uses)
    console.log('Testing as anonymous user (frontend mode)...');
    
    // Create a client with anon key
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    try {
      const { data, error } = await anonClient
        .from('equipment')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ ANON EQUIPMENT QUERY FAILED: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${error.details}`);
        console.log('   🚨 THIS IS LIKELY THE ISSUE!');
      } else {
        console.log(`✅ Anon equipment query works: ${data?.length || 0} items`);
      }
    } catch (e) {
      console.log(`❌ Anon equipment query exception: ${e.message}`);
    }

    // Test bag_equipment as anon
    try {
      const { data, error } = await anonClient
        .from('bag_equipment')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ ANON BAG_EQUIPMENT QUERY FAILED: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      } else {
        console.log(`✅ Anon bag_equipment query works: ${data?.length || 0} items`);
      }
    } catch (e) {
      console.log(`❌ Anon bag_equipment query exception: ${e.message}`);
    }

    // Test the specific join query
    try {
      const { data, error } = await anonClient
        .from('bag_equipment')
        .select(`
          *,
          equipment(*)
        `)
        .limit(1);
        
      if (error) {
        console.log(`❌ ANON JOIN QUERY FAILED: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log('   🚨 THIS IS THE ROOT CAUSE!');
      } else {
        console.log(`✅ Anon join query works: ${data?.length || 0} items`);
      }
    } catch (e) {
      console.log(`❌ Anon join query exception: ${e.message}`);
    }

    console.log('\n3. CHECKING CURRENT POLICIES STATUS...\n');
    
    // Let's see what the current state is
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            t.table_name,
            t.table_schema,
            c.relrowsecurity as rls_enabled,
            COUNT(p.policyname) as policy_count
          FROM information_schema.tables t
          LEFT JOIN pg_class c ON c.relname = t.table_name
          LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
          LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = t.table_schema
          WHERE t.table_schema = 'public' 
          AND t.table_name IN ('profiles', 'equipment', 'user_bags', 'bag_equipment', 'equipment_photos')
          GROUP BY t.table_name, t.table_schema, c.relrowsecurity
          ORDER BY t.table_name;
        `
      });
      
      if (error) {
        console.log(`❌ Cannot get policy summary: ${error.message}`);
      } else {
        console.log('📊 POLICY SUMMARY:');
        console.log('Table              | RLS | Policies');
        console.log('-------------------|-----|----------');
        data?.forEach(row => {
          const rlsStatus = row.rls_enabled ? '✅' : '❌';
          const policyCount = row.policy_count || 0;
          const policyStatus = policyCount > 0 ? `${policyCount}` : '⚠️ 0';
          console.log(`${row.table_name.padEnd(18)} | ${rlsStatus}  | ${policyStatus}`);
        });
      }
    } catch (e) {
      console.log(`❌ Policy summary failed: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR during RLS check:', error);
  }
}

// Run the RLS check
checkRLSPolicies().then(() => {
  console.log('\n🔒 RLS CHECK COMPLETE');
  console.log('\nIf tables have RLS enabled but 0 policies, that blocks all access!');
  console.log('If anon queries fail, we need to create proper RLS policies.');
  process.exit(0);
}).catch(error => {
  console.error('💥 RLS CHECK CRASHED:', error);
  process.exit(1);
});