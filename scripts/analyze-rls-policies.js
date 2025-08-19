#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

const FEED_RELATED_TABLES = [
  'feed_posts',
  'feed_likes', 
  'profiles',
  'user_follows',
  'equipment',
  'equipment_photos',
  'user_bags',
  'bag_equipment'
];

async function executeRawQuery(query) {
  try {
    const { data, error } = await supabase.rpc('sql', { query });
    if (error) {
      console.error('Query error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Raw query failed:', err.message);
    return null;
  }
}

async function checkRLSStatus() {
  console.log('🔍 ANALYZING RLS STATUS FOR FEED-RELATED TABLES\n');
  console.log('=' .repeat(80));
  
  const rlsQuery = `
    SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        hasoids
    FROM pg_tables 
    WHERE tablename = ANY($1)
    AND schemaname = 'public'
    ORDER BY tablename;
  `;
  
  let rlsData = await executeRawQuery(rlsQuery.replace('$1', `ARRAY['${FEED_RELATED_TABLES.join("','")}']`));
  
  if (!rlsData) {
    // Fallback: check each table individually
    console.log('Fallback: Checking tables individually...\n');
    
    for (const table of FEED_RELATED_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table.padEnd(20)} - Error: ${error.message}`);
        } else {
          console.log(`✅ ${table.padEnd(20)} - Accessible (${data?.length || 0} rows)`);
        }
      } catch (err) {
        console.log(`❌ ${table.padEnd(20)} - Exception: ${err.message}`);
      }
    }
    return;
  }
  
  console.log('\n📊 RLS STATUS SUMMARY:\n');
  console.log('Table Name           | RLS Enabled | Schema');
  console.log('---------------------|-------------|--------');
  
  const rlsStatus = {};
  rlsData.forEach(row => {
    const status = row.rls_enabled ? '✅ YES' : '❌ NO';
    console.log(`${row.tablename.padEnd(20)} | ${status.padEnd(11)} | ${row.schemaname}`);
    rlsStatus[row.tablename] = row.rls_enabled;
  });
  
  return rlsStatus;
}

async function analyzePolicies() {
  console.log('\n\n🛡️  ANALYZING RLS POLICIES\n');
  console.log('=' .repeat(80));
  
  const policiesQuery = `
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
    WHERE tablename = ANY(ARRAY['${FEED_RELATED_TABLES.join("','")}'])
    AND schemaname = 'public'
    ORDER BY tablename, policyname;
  `;
  
  const policies = await executeRawQuery(policiesQuery);
  
  if (!policies || policies.length === 0) {
    console.log('⚠️  NO RLS POLICIES FOUND\n');
    console.log('This could mean:');
    console.log('1. Tables exist but have no RLS policies defined');
    console.log('2. Tables have RLS enabled but allow unrestricted access');
    console.log('3. Query permissions insufficient to read pg_policies');
    return {};
  }
  
  const policyByTable = {};
  
  console.log('\n📋 DETAILED POLICY ANALYSIS:\n');
  
  policies.forEach(policy => {
    if (!policyByTable[policy.tablename]) {
      policyByTable[policy.tablename] = [];
    }
    policyByTable[policy.tablename].push(policy);
  });
  
  for (const [tableName, tablePolicies] of Object.entries(policyByTable)) {
    console.log(`\n🏷️  TABLE: ${tableName.toUpperCase()}`);
    console.log('-'.repeat(50));
    
    tablePolicies.forEach(policy => {
      console.log(`\n  Policy: ${policy.policyname}`);
      console.log(`  Command: ${policy.cmd || 'ALL'}`);
      console.log(`  Roles: ${policy.roles ? policy.roles.join(', ') : 'ALL'}`);
      console.log(`  Permissive: ${policy.permissive ? 'YES' : 'NO'}`);
      
      if (policy.qual) {
        console.log(`  Condition: ${policy.qual}`);
      }
      
      if (policy.with_check) {
        console.log(`  With Check: ${policy.with_check}`);
      }
    });
  }
  
  return policyByTable;
}

async function testAnonymousAccess() {
  console.log('\n\n🔓 TESTING ANONYMOUS ACCESS\n');
  console.log('=' .repeat(80));
  
  // Create anonymous client
  const anonClient = supabase;
  
  console.log('\n📊 Anonymous Access Test Results:\n');
  console.log('Table Name           | Status    | Row Count | Error');
  console.log('---------------------|-----------|-----------|---------------------------');
  
  const results = {};
  
  for (const table of FEED_RELATED_TABLES) {
    try {
      const { data, error, count } = await anonClient
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${table.padEnd(20)} | ❌ ERROR   | N/A       | ${error.message.substring(0, 25)}...`);
        results[table] = { accessible: false, error: error.message, count: 0 };
      } else {
        console.log(`${table.padEnd(20)} | ✅ OK      | ${String(count || 0).padEnd(9)} | None`);
        results[table] = { accessible: true, error: null, count: count || 0 };
      }
    } catch (err) {
      console.log(`${table.padEnd(20)} | ❌ EXCEPT  | N/A       | ${err.message.substring(0, 25)}...`);
      results[table] = { accessible: false, error: err.message, count: 0 };
    }
  }
  
  return results;
}

async function identifyIssues(rlsStatus, policies, anonAccess) {
  console.log('\n\n⚠️  POTENTIAL ISSUES IDENTIFIED\n');
  console.log('=' .repeat(80));
  
  const issues = [];
  
  // Check for tables with RLS enabled but no policies
  for (const table of FEED_RELATED_TABLES) {
    if (rlsStatus[table] === true && (!policies[table] || policies[table].length === 0)) {
      issues.push({
        type: 'RLS_NO_POLICIES',
        table,
        severity: 'HIGH',
        description: `Table has RLS enabled but no policies defined - will block ALL access`
      });
    }
  }
  
  // Check for anonymous access failures
  for (const [table, result] of Object.entries(anonAccess)) {
    if (!result.accessible) {
      issues.push({
        type: 'ANONYMOUS_ACCESS_BLOCKED',
        table,
        severity: 'HIGH',
        description: `Anonymous access blocked: ${result.error}`
      });
    }
  }
  
  // Check for missing core tables
  for (const table of FEED_RELATED_TABLES) {
    if (!rlsStatus.hasOwnProperty(table)) {
      issues.push({
        type: 'TABLE_MISSING',
        table,
        severity: 'CRITICAL',
        description: `Table does not exist in database`
      });
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ NO CRITICAL ISSUES FOUND\n');
    console.log('All feed-related tables appear to have appropriate RLS configuration.');
    return issues;
  }
  
  console.log(`🚨 FOUND ${issues.length} ISSUE(S):\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.table}`);
    console.log(`   Type: ${issue.type}`);
    console.log(`   Description: ${issue.description}\n`);
  });
  
  return issues;
}

async function generateRecommendations(issues) {
  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('=' .repeat(80));
  
  if (issues.length === 0) {
    console.log('✅ No immediate action required.');
    console.log('Consider periodic reviews of RLS policies for security best practices.');
    return;
  }
  
  const recommendations = [];
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 'RLS_NO_POLICIES':
        recommendations.push({
          priority: 1,
          action: `Create RLS policies for ${issue.table}`,
          sql: `-- Enable public read access for ${issue.table}
CREATE POLICY "Public read access" ON public.${issue.table}
FOR SELECT USING (true);`
        });
        break;
        
      case 'ANONYMOUS_ACCESS_BLOCKED':
        recommendations.push({
          priority: 2,
          action: `Review and fix RLS policies for ${issue.table}`,
          sql: `-- Check current policies
SELECT * FROM pg_policies WHERE tablename = '${issue.table}';
          
-- If no policies exist, create public read access
CREATE POLICY "Public read access" ON public.${issue.table}
FOR SELECT USING (true);`
        });
        break;
        
      case 'TABLE_MISSING':
        recommendations.push({
          priority: 3,
          action: `Create missing table: ${issue.table}`,
          sql: `-- Table creation needed for ${issue.table}
-- Check existing schema files or create table definition`
        });
        break;
    }
  });
  
  recommendations.sort((a, b) => a.priority - b.priority);
  
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.action}`);
    console.log(`\n   SQL to execute:`);
    console.log(`   ${rec.sql.split('\n').join('\n   ')}\n`);
  });
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive RLS analysis...\n');
    
    const rlsStatus = await checkRLSStatus();
    const policies = await analyzePolicies();
    const anonAccess = await testAnonymousAccess();
    const issues = await identifyIssues(rlsStatus, policies, anonAccess);
    await generateRecommendations(issues);
    
    console.log('\n✅ RLS Analysis Complete!');
    console.log('\nRun this script anytime with: node scripts/analyze-rls-policies.js');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();