#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

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

// Create an anonymous client for comparison
const anonClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTableAccess(client, clientType) {
  console.log(`\n🔍 Testing ${clientType} access:\n`);
  console.log('Table Name           | Status    | Row Count | Sample Error');
  console.log('---------------------|-----------|-----------|---------------------------');
  
  const results = {};
  
  for (const table of FEED_RELATED_TABLES) {
    try {
      // Try to select with count
      const { data, error, count } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${table.padEnd(20)} | ❌ ERROR   | N/A       | ${error.message.substring(0, 25)}...`);
        results[table] = { 
          accessible: false, 
          error: error.message, 
          count: 0,
          errorCode: error.code 
        };
      } else {
        console.log(`${table.padEnd(20)} | ✅ OK      | ${String(count || 0).padEnd(9)} | None`);
        results[table] = { 
          accessible: true, 
          error: null, 
          count: count || 0,
          errorCode: null 
        };
      }
    } catch (err) {
      console.log(`${table.padEnd(20)} | ❌ EXCEPT  | N/A       | ${err.message.substring(0, 25)}...`);
      results[table] = { 
        accessible: false, 
        error: err.message, 
        count: 0,
        errorCode: 'EXCEPTION'
      };
    }
  }
  
  return results;
}

async function compareAccess(adminResults, anonResults) {
  console.log('\n\n📊 ACCESS COMPARISON SUMMARY\n');
  console.log('=' .repeat(80));
  
  console.log('\nTable Name           | Admin     | Anonymous | Issue Type');
  console.log('---------------------|-----------|-----------|---------------------------');
  
  const issues = [];
  
  for (const table of FEED_RELATED_TABLES) {
    const adminOk = adminResults[table]?.accessible || false;
    const anonOk = anonResults[table]?.accessible || false;
    
    let status = '';
    let issueType = '';
    
    if (adminOk && anonOk) {
      status = '✅ BOTH OK ';
      issueType = 'None';
    } else if (adminOk && !anonOk) {
      status = '⚠️  ADMIN ONLY';
      issueType = 'Anonymous blocked';
      issues.push({
        table,
        type: 'ANONYMOUS_BLOCKED',
        adminError: adminResults[table]?.error,
        anonError: anonResults[table]?.error
      });
    } else if (!adminOk && anonOk) {
      status = '🔄 ANON ONLY';
      issueType = 'Admin blocked';
      issues.push({
        table,
        type: 'ADMIN_BLOCKED', 
        adminError: adminResults[table]?.error,
        anonError: anonResults[table]?.error
      });
    } else {
      status = '❌ BOTH FAIL';
      issueType = 'Both blocked';
      issues.push({
        table,
        type: 'BOTH_BLOCKED',
        adminError: adminResults[table]?.error,
        anonError: anonResults[table]?.error
      });
    }
    
    console.log(`${table.padEnd(20)} | ${status} | ${anonOk ? 'OK' : 'BLOCKED'} | ${issueType}`);
  }
  
  return issues;
}

async function analyzeSpecificErrors(adminResults, anonResults) {
  console.log('\n\n🔍 DETAILED ERROR ANALYSIS\n');
  console.log('=' .repeat(80));
  
  for (const table of FEED_RELATED_TABLES) {
    const adminResult = adminResults[table];
    const anonResult = anonResults[table];
    
    // Only show tables with errors
    if (!adminResult?.accessible || !anonResult?.accessible) {
      console.log(`\n🏷️  TABLE: ${table.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      if (!adminResult?.accessible) {
        console.log(`  Admin Error: ${adminResult?.error || 'Unknown'}`);
        console.log(`  Admin Code: ${adminResult?.errorCode || 'Unknown'}`);
      } else {
        console.log(`  Admin: ✅ OK (${adminResult.count} rows)`);
      }
      
      if (!anonResult?.accessible) {
        console.log(`  Anon Error: ${anonResult?.error || 'Unknown'}`);
        console.log(`  Anon Code: ${anonResult?.errorCode || 'Unknown'}`);
      } else {
        console.log(`  Anonymous: ✅ OK (${anonResult.count} rows)`);
      }
    }
  }
}

async function checkRLSSettings() {
  console.log('\n\n🛡️  CHECKING RLS SETTINGS (if possible)\n');
  console.log('=' .repeat(80));
  
  try {
    // Try to check if we can access pg_tables for RLS info
    const testQuery = `SELECT 1 as test`;
    const { data, error } = await supabase.rpc('sql', { query: testQuery });
    
    if (error) {
      console.log('⚠️  Cannot execute raw SQL queries - RLS details unavailable');
      console.log('   This is normal for non-admin connections');
      return null;
    }
    
    // If we can run SQL, try to get RLS status
    const rlsQuery = `
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE tablename IN (${FEED_RELATED_TABLES.map(t => `'${t}'`).join(',')})
      AND schemaname = 'public'
    `;
    
    const { data: rlsData, error: rlsError } = await supabase.rpc('sql', { query: rlsQuery });
    
    if (rlsError) {
      console.log('⚠️  Cannot access RLS settings - insufficient permissions');
      return null;
    }
    
    console.log('Table Name           | RLS Enabled');
    console.log('---------------------|-------------');
    
    rlsData.forEach(row => {
      const status = row.rowsecurity ? '✅ YES' : '❌ NO';
      console.log(`${row.tablename.padEnd(20)} | ${status}`);
    });
    
    return rlsData;
    
  } catch (err) {
    console.log('⚠️  RLS settings check failed:', err.message);
    return null;
  }
}

async function generateRecommendations(issues) {
  console.log('\n\n💡 RECOMMENDATIONS\n');
  console.log('=' .repeat(80));
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found!');
    console.log('\nAll tables are accessible by both admin and anonymous users.');
    console.log('This suggests proper RLS policies are in place for public read access.');
    return;
  }
  
  console.log(`Found ${issues.length} issue(s) that may affect data loading:\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. TABLE: ${issue.table}`);
    console.log(`   Issue Type: ${issue.type}`);
    
    switch (issue.type) {
      case 'ANONYMOUS_BLOCKED':
        console.log('   Problem: Anonymous users cannot access this table');
        console.log('   Impact: Data will not load for unauthenticated users');
        console.log('   Solution: Create or fix RLS policy for public SELECT access');
        console.log(`   SQL Fix: `);
        console.log(`   CREATE POLICY "Public read access" ON public.${issue.table}`);
        console.log(`   FOR SELECT USING (true);`);
        break;
        
      case 'ADMIN_BLOCKED':
        console.log('   Problem: Admin access is blocked (unusual)');
        console.log('   Impact: Backend operations may fail');
        console.log('   Solution: Check service role permissions');
        break;
        
      case 'BOTH_BLOCKED':
        console.log('   Problem: No access for any user type');
        console.log('   Impact: Table is completely inaccessible');
        console.log('   Solution: Check if table exists and fix RLS policies');
        break;
    }
    
    if (issue.anonError) {
      console.log(`   Anon Error: ${issue.anonError.substring(0, 100)}...`);
    }
    console.log('');
  });
}

async function main() {
  console.log('🚀 RLS & Data Access Analysis');
  console.log('=' .repeat(80));
  console.log('\nAnalyzing why data loading differs between authenticated and anonymous users...\n');
  
  try {
    // Test both admin/service role and anonymous access
    const adminResults = await testTableAccess(supabase, 'ADMIN/SERVICE');
    const anonResults = await testTableAccess(anonClient, 'ANONYMOUS');
    
    const issues = await compareAccess(adminResults, anonResults);
    await analyzeSpecificErrors(adminResults, anonResults);
    await checkRLSSettings();
    await generateRecommendations(issues);
    
    console.log('\n✅ Analysis Complete!');
    console.log('\nKey Findings Summary:');
    console.log(`- ${FEED_RELATED_TABLES.length} tables analyzed`);
    console.log(`- ${issues.length} potential issues identified`);
    
    if (issues.length === 0) {
      console.log('\n🎉 No critical RLS issues found!');
      console.log('Both authenticated and anonymous users should have proper access.');
    } else {
      console.log('\n⚠️  Issues found that may cause data loading problems.');
      console.log('See recommendations above for fixes.');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();