#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkRLSPoliciesViaSQL() {
  console.log('🔍 CHECKING RLS POLICIES VIA DIRECT TABLE QUERIES\n');
  console.log('=' .repeat(80));
  
  const FEED_TABLES = [
    'feed_posts', 'feed_likes', 'profiles', 'user_follows',
    'equipment', 'equipment_photos', 'user_bags', 'bag_equipment'
  ];
  
  try {
    // First, try to check if RLS is enabled on these tables
    // We'll do this by trying different approaches
    
    console.log('📊 Method 1: Testing public access patterns\n');
    
    for (const table of FEED_TABLES) {
      try {
        // Test if we can query the table info
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table.padEnd(20)} - ${error.message}`);
          if (error.message.includes('RLS')) {
            console.log(`    ℹ️  This table has RLS policies blocking access`);
          }
        } else {
          console.log(`✅ ${table.padEnd(20)} - Accessible (${data?.length || 0} rows counted: ${error?.count || 'unknown'})`);
        }
      } catch (err) {
        console.log(`❌ ${table.padEnd(20)} - Exception: ${err.message}`);
      }
    }
    
    console.log('\n📊 Method 2: Testing with information_schema queries\n');
    
    // Try to get table information
    try {
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .in('table_name', FEED_TABLES);
      
      if (error) {
        console.log(`❌ Cannot access information_schema.tables: ${error.message}`);
      } else {
        console.log(`✅ Found ${tables?.length || 0} tables in information_schema`);
        tables?.forEach(table => {
          console.log(`   • ${table.table_name} (${table.table_schema})`);
        });
      }
    } catch (err) {
      console.log(`❌ Information schema query failed: ${err.message}`);
    }
    
    console.log('\n📊 Method 3: Attempting to query pg_class for RLS info\n');
    
    // Try to query system tables for RLS info
    // This might not work with limited permissions but we'll try
    try {
      // Use a function call that might give us RLS status
      const { data, error } = await supabase.rpc('get_table_rls_status', {});
      
      if (error) {
        console.log(`❌ RLS status function not available: ${error.message}`);
      } else {
        console.log(`✅ RLS status function returned:`, data);
      }
    } catch (err) {
      console.log(`❌ System table query failed (expected): ${err.message}`);
    }
    
  } catch (error) {
    console.error('Error in RLS policy check:', error);
  }
}

async function testSpecificRLSScenarios() {
  console.log('\n\n🧪 TESTING SPECIFIC RLS SCENARIOS\n');
  console.log('=' .repeat(80));
  
  const scenarios = [
    {
      name: 'Anonymous read access',
      description: 'Testing if anonymous users can read public data',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_posts')
          .select('id, type, created_at')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length };
      }
    },
    {
      name: 'Profile join access',
      description: 'Testing joined queries with profiles',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_posts')
          .select(`
            id,
            profile:profiles!feed_posts_user_id_fkey(username)
          `)
          .limit(1);
        return { success: !error, error: error?.message, hasProfile: data?.[0]?.profile };
      }
    },
    {
      name: 'Equipment join access',
      description: 'Testing equipment table joins',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_posts')
          .select(`
            id,
            equipment:equipment(brand, model)
          `)
          .not('equipment_id', 'is', null)
          .limit(1);
        return { success: !error, error: error?.message, hasEquipment: data?.[0]?.equipment };
      }
    },
    {
      name: 'Bag join access',
      description: 'Testing bag table joins',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_posts')
          .select(`
            id,
            bag:user_bags(name)
          `)
          .not('bag_id', 'is', null)
          .limit(1);
        return { success: !error, error: error?.message, hasBag: data?.[0]?.bag };
      }
    },
    {
      name: 'Likes table access',
      description: 'Testing feed_likes table access',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_likes')
          .select('id, user_id, post_id')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length };
      }
    },
    {
      name: 'Complex join query',
      description: 'Testing the full complex query used by the app',
      test: async () => {
        const { data, error } = await supabase
          .from('feed_posts')
          .select(`
            *,
            profile:profiles!feed_posts_user_id_fkey(
              username,
              display_name,
              avatar_url,
              handicap,
              title
            ),
            equipment:equipment(
              id,
              brand,
              model,
              category,
              image_url
            ),
            bag:user_bags(
              id,
              name,
              description,
              background_image
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);
        return { success: !error, error: error?.message, count: data?.length };
      }
    }
  ];
  
  console.log('Running RLS scenario tests...\n');
  
  for (const scenario of scenarios) {
    try {
      console.log(`🔍 ${scenario.name}`);
      console.log(`   ${scenario.description}`);
      
      const result = await scenario.test();
      
      if (result.success) {
        console.log(`   ✅ SUCCESS`);
        if (result.count !== undefined) console.log(`      Records: ${result.count}`);
        if (result.hasProfile !== undefined) console.log(`      Has profile data: ${result.hasProfile}`);
        if (result.hasEquipment !== undefined) console.log(`      Has equipment data: ${result.hasEquipment}`);
        if (result.hasBag !== undefined) console.log(`      Has bag data: ${result.hasBag}`);
      } else {
        console.log(`   ❌ FAILED: ${result.error}`);
        
        // Check if this is an RLS policy issue
        if (result.error?.includes('policy') || result.error?.includes('RLS')) {
          console.log(`      🛡️  This appears to be an RLS policy restriction`);
        }
      }
      
      console.log('');
    } catch (err) {
      console.log(`   ❌ EXCEPTION: ${err.message}\n`);
    }
  }
}

async function analyzeCurrentPolicyBehavior() {
  console.log('\n\n🔍 ANALYZING CURRENT RLS POLICY BEHAVIOR\n');
  console.log('=' .repeat(80));
  
  const findings = [];
  
  // Test 1: Check if tables require authentication
  console.log('📊 Testing authentication requirements...\n');
  
  const authTests = [
    { table: 'feed_posts', description: 'Main feed data' },
    { table: 'profiles', description: 'User profiles' },
    { table: 'equipment', description: 'Equipment database' },
    { table: 'feed_likes', description: 'Like interactions' }
  ];
  
  for (const test of authTests) {
    try {
      const { data, error, count } = await supabase
        .from(test.table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        findings.push({
          table: test.table,
          issue: 'ACCESS_DENIED',
          message: error.message,
          severity: 'HIGH'
        });
        console.log(`❌ ${test.table}: ${error.message}`);
      } else {
        console.log(`✅ ${test.table}: ${count} rows accessible`);
        findings.push({
          table: test.table,
          issue: 'ACCESSIBLE',
          message: `Table accessible with ${count} rows`,
          severity: 'INFO'
        });
      }
    } catch (err) {
      findings.push({
        table: test.table,
        issue: 'EXCEPTION',
        message: err.message,
        severity: 'HIGH'
      });
      console.log(`❌ ${test.table}: Exception - ${err.message}`);
    }
  }
  
  return findings;
}

async function generateRLSReport(findings) {
  console.log('\n\n📋 RLS POLICY ANALYSIS REPORT\n');
  console.log('=' .repeat(80));
  
  const accessibleTables = findings.filter(f => f.issue === 'ACCESSIBLE');
  const deniedTables = findings.filter(f => f.issue === 'ACCESS_DENIED');
  const errorTables = findings.filter(f => f.issue === 'EXCEPTION');
  
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Accessible tables: ${accessibleTables.length}`);
  console.log(`   ❌ Access denied: ${deniedTables.length}`);
  console.log(`   ⚠️  Exceptions: ${errorTables.length}`);
  
  if (accessibleTables.length > 0) {
    console.log('\n✅ ACCESSIBLE TABLES:');
    accessibleTables.forEach(f => {
      console.log(`   • ${f.table}: ${f.message}`);
    });
  }
  
  if (deniedTables.length > 0) {
    console.log('\n❌ ACCESS DENIED TABLES:');
    deniedTables.forEach(f => {
      console.log(`   • ${f.table}: ${f.message}`);
    });
  }
  
  if (errorTables.length > 0) {
    console.log('\n⚠️  EXCEPTION TABLES:');
    errorTables.forEach(f => {
      console.log(`   • ${f.table}: ${f.message}`);
    });
  }
  
  console.log('\n🔧 RLS POLICY ANALYSIS:');
  
  if (deniedTables.length === 0 && errorTables.length === 0) {
    console.log('   ✅ All tables are publicly accessible');
    console.log('   ✅ RLS policies allow anonymous read access');
    console.log('   ✅ This explains why both auth and anon users can load data');
    
    console.log('\n💡 LIKELY RLS CONFIGURATION:');
    console.log('   • Tables have RLS enabled');
    console.log('   • Policies exist for public SELECT operations');
    console.log('   • Policies use USING (true) for read access');
    console.log('   • This is a common pattern for public feeds');
  } else {
    console.log('   ⚠️  Some tables have access restrictions');
    console.log('   ⚠️  This could cause data loading issues');
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    deniedTables.forEach(f => {
      console.log(`   • ${f.table}: Add public read policy`);
      console.log(`     CREATE POLICY "Public read access" ON public.${f.table}`);
      console.log(`     FOR SELECT USING (true);`);
      console.log('');
    });
  }
}

async function main() {
  console.log('🚀 COMPREHENSIVE RLS POLICY ANALYSIS\n');
  
  try {
    await checkRLSPoliciesViaSQL();
    await testSpecificRLSScenarios();
    const findings = await analyzeCurrentPolicyBehavior();
    await generateRLSReport(findings);
    
    console.log('\n✅ RLS Policy Analysis Complete!');
    console.log('\nKey Takeaway: The analysis shows whether your RLS policies');
    console.log('are properly configured for your feed system\'s needs.');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();