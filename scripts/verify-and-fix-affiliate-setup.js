#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkTableExists(tableName) {
  console.log(`\n🔍 Checking table: ${tableName}`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Table exists with ${data?.length || 0} rows (count: ${data?.count || 0})`);
    return true;
  } catch (error) {
    console.log(`❌ Table check failed: ${error.message}`);
    return false;
  }
}

async function checkRLSEnabled(tableName) {
  console.log(`\n🔒 Checking RLS status for: ${tableName}`);
  
  try {
    // Create an anonymous client to test RLS
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Test anonymous access
    const { data: anonData, error: anonError } = await anonClient
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Test admin access
    const { data: adminData, error: adminError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    console.log(`Anonymous access: ${anonError ? '❌ ' + anonError.message : '✅ Success'}`);
    console.log(`Admin access: ${adminError ? '❌ ' + adminError.message : '✅ Success'}`);
    
    return { anonError, adminError };
  } catch (error) {
    console.log(`❌ RLS check failed: ${error.message}`);
    return { error };
  }
}

async function testFunctionality() {
  console.log('\n🧪 TESTING FUNCTIONALITY');
  console.log('=' * 50);
  
  const tables = [
    'user_equipment_links',
    'equipment_videos', 
    'user_bag_videos',
    'link_clicks'
  ];
  
  const results = {};
  
  for (const table of tables) {
    results[table] = {
      exists: await checkTableExists(table),
      rls: await checkRLSEnabled(table)
    };
  }
  
  return results;
}

async function checkRequiredTables() {
  console.log('\n📋 CHECKING REQUIRED TABLES');
  console.log('=' * 50);
  
  const requiredTables = [
    'profiles',
    'user_bags',
    'equipment',
    'bag_equipment'
  ];
  
  for (const table of requiredTables) {
    await checkTableExists(table);
  }
}

async function checkPolicies() {
  console.log('\n🛡️ CHECKING RLS POLICIES');
  console.log('=' * 50);
  
  try {
    // Check if we can access pg_policies view
    const { data, error } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, cmd')
      .in('tablename', ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks']);
    
    if (error) {
      console.log('❌ Cannot access pg_policies:', error.message);
      return;
    }
    
    console.log(`📊 Found ${data.length} policies:`);
    data.forEach(policy => {
      console.log(`  - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
    });
    
    if (data.length === 0) {
      console.log('⚠️  No RLS policies found! This needs to be fixed.');
    }
    
  } catch (error) {
    console.log('❌ Policy check failed:', error.message);
  }
}

async function runSQL(description, sql) {
  console.log(`\n🔧 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.log(`❌ Failed: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Success`);
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function fixCommonIssues(results) {
  console.log('\n🔧 FIXING COMMON ISSUES');
  console.log('=' * 50);
  
  // Check if user_bags table is actually named correctly
  const bagsTableCheck = await checkTableExists('user_bags');
  if (!bagsTableCheck) {
    console.log('⚠️  user_bags table not found - checking if it\'s named "bags"');
    const altBagsCheck = await checkTableExists('bags');
    if (altBagsCheck) {
      console.log('✅ Found table named "bags" instead of "user_bags"');
    }
  }
  
  // Enable RLS if not enabled
  const rlsCommands = [
    'ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY', 
    'ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY'
  ];
  
  for (const command of rlsCommands) {
    await runSQL(`Enabling RLS`, command);
  }
  
  // Test basic policies that should work
  const basicPolicies = [
    {
      name: 'Basic SELECT for user_equipment_links',
      sql: `
        CREATE POLICY "allow_read_user_equipment_links" 
        ON user_equipment_links FOR SELECT 
        USING (true);
      `
    },
    {
      name: 'Basic SELECT for equipment_videos',
      sql: `
        CREATE POLICY "allow_read_equipment_videos" 
        ON equipment_videos FOR SELECT 
        USING (true);
      `
    },
    {
      name: 'Basic SELECT for user_bag_videos',
      sql: `
        CREATE POLICY "allow_read_user_bag_videos" 
        ON user_bag_videos FOR SELECT 
        USING (true);
      `
    },
    {
      name: 'Basic INSERT for link_clicks',
      sql: `
        CREATE POLICY "allow_insert_link_clicks" 
        ON link_clicks FOR INSERT 
        WITH CHECK (true);
      `
    }
  ];
  
  for (const policy of basicPolicies) {
    await runSQL(policy.name, policy.sql);
  }
}

async function generateReport(results) {
  console.log('\n📊 COMPREHENSIVE REPORT');
  console.log('=' * 50);
  
  const issues = [];
  const working = [];
  
  Object.entries(results).forEach(([table, result]) => {
    if (!result.exists) {
      issues.push(`❌ Table ${table} does not exist`);
    } else {
      working.push(`✅ Table ${table} exists`);
      
      if (result.rls.anonError && result.rls.anonError.message.includes('policy')) {
        working.push(`✅ RLS is enforcing policies on ${table}`);
      } else if (!result.rls.anonError) {
        issues.push(`⚠️  Table ${table} is accessible to anonymous users (may need RLS policies)`);
      }
    }
  });
  
  console.log('\n✅ WHAT\'S WORKING:');
  working.forEach(item => console.log(`  ${item}`));
  
  console.log('\n❌ ISSUES FOUND:');
  if (issues.length === 0) {
    console.log('  🎉 No major issues found!');
  } else {
    issues.forEach(item => console.log(`  ${item}`));
  }
  
  return { working, issues };
}

async function main() {
  console.log('🔍 COMPREHENSIVE AFFILIATE LINKS & VIDEO FEATURES CHECK');
  console.log('=' * 60);
  
  await checkRequiredTables();
  
  const results = await testFunctionality();
  
  await checkPolicies();
  
  await fixCommonIssues(results);
  
  // Re-test after fixes
  console.log('\n🔄 RE-TESTING AFTER FIXES...');
  const newResults = await testFunctionality();
  
  const report = await generateReport(newResults);
  
  console.log('\n🎯 NEXT STEPS:');
  if (report.issues.length > 0) {
    console.log('  1. Review the issues above');
    console.log('  2. Apply the optimized RLS script: node scripts/apply-optimized-rls.js');
    console.log('  3. Test the functionality manually');
  } else {
    console.log('  1. Test adding affiliate links to equipment');
    console.log('  2. Test adding videos to equipment pages');
    console.log('  3. Test bag video functionality');
    console.log('  4. Test link click tracking');
  }
  
  console.log('\n✨ Check complete!');
}

main().catch(console.error);