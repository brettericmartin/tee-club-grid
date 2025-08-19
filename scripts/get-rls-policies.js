#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getRLSPolicies() {
  console.log('🔍 Getting RLS policies for all tables...\n');
  
  const tables = [
    'feed_posts', 'feed_likes', 'profiles', 'user_follows', 
    'equipment', 'equipment_photos', 'user_bags', 'bag_equipment',
    'equipment_saves', 'equipment_tees', 'bag_tees', 'feed_comments',
    'equipment_reviews'
  ];
  
  try {
    // First, let's try to get a list of existing tables
    console.log('📋 Testing table existence...');
    
    for (const tableName of tables) {
      try {
        // Try to query each table to see if it exists
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`  ❌ Table '${tableName}' does not exist`);
          } else {
            console.log(`  ✅ Table '${tableName}' exists (error: ${error.message})`);
          }
        } else {
          console.log(`  ✅ Table '${tableName}' exists and accessible`);
        }
      } catch (err) {
        console.log(`  ❓ Error checking '${tableName}': ${err.message}`);
      }
    }
    
    console.log('\n🔐 Attempting to get RLS policies using SQL...');
    
    // Try to execute raw SQL to get policies
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
      WHERE tablename IN ('feed_posts', 'feed_likes', 'profiles', 'user_follows', 
                          'equipment', 'equipment_photos', 'user_bags', 'bag_equipment',
                          'equipment_saves', 'equipment_tees', 'bag_tees', 'feed_comments',
                          'equipment_reviews')
      ORDER BY tablename, policyname;
    `;
    
    const { data: policies, error: policyError } = await supabase.rpc('sql', { 
      query: policyQuery 
    });
    
    if (policyError) {
      console.log('❌ Error getting policies via SQL RPC:', policyError.message);
      
      // Try alternative approach - check RLS status
      console.log('\n🔍 Checking RLS status for individual tables...');
      
      for (const tableName of tables) {
        try {
          // Try to access the table's metadata
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);  // Get no rows, just check access
          
          if (!error) {
            console.log(`\n🔸 Table: ${tableName}`);
            console.log('  Status: Accessible (likely has appropriate RLS policies)');
            
            // Common policy names based on patterns I've seen
            const commonPolicyNames = [
              `${tableName}_select_policy`,
              `${tableName}_insert_policy`, 
              `${tableName}_update_policy`,
              `${tableName}_delete_policy`,
              `select_${tableName}`,
              `insert_${tableName}`,
              `update_${tableName}`,
              `delete_${tableName}`,
              'select_policy',
              'insert_policy',
              'update_policy', 
              'delete_policy',
              'public_read',
              'authenticated_access',
              'user_access'
            ];
            
            console.log('  Possible policy names to check:');
            commonPolicyNames.forEach(name => {
              console.log(`    - ${name}`);
            });
          }
        } catch (tableError) {
          console.log(`  ❌ Cannot access ${tableName}: ${tableError.message}`);
        }
      }
      
    } else if (policies && policies.length > 0) {
      console.log('\n📋 RLS Policies Found:');
      
      let currentTable = '';
      policies.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n🔸 Table: ${policy.tablename}`);
        }
        
        console.log(`  Policy Name: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Permissive: ${policy.permissive}`);
        console.log(`  Roles: ${policy.roles ? policy.roles.join(', ') : 'none'}`);
        if (policy.qual) console.log(`  Qualification: ${policy.qual}`);
        if (policy.with_check) console.log(`  With Check: ${policy.with_check}`);
        console.log('');
      });
      
      // Generate DROP statements
      console.log('\n🗑️  DROP statements for existing policies:');
      console.log('-- Copy and paste these to remove existing policies:');
      console.log('');
      
      policies.forEach(policy => {
        console.log(`DROP POLICY IF EXISTS "${policy.policyname}" ON "${policy.tablename}";`);
      });
      
    } else {
      console.log('✅ No RLS policies found for the specified tables.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n✨ RLS policy check complete!');
  console.log('\n💡 Note: Some tables may not exist yet, which is normal.');
  console.log('💡 If you see access errors, it likely means RLS is working correctly.');
}

// Run the function
getRLSPolicies().catch(console.error);