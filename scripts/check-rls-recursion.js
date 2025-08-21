#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkRLSRecursion() {
  console.log('🔍 Checking for RLS policy infinite recursion...\n');

  // First, check if RLS is enabled on tables
  const checkRLSQuery = `
    SELECT 
      schemaname,
      tablename,
      rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts', 'user_bags', 'bag_equipment');
  `;

  const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', { 
    sql: checkRLSQuery 
  }).single();

  if (rlsError) {
    console.log('⚠️  Could not check RLS status directly, trying alternative...');
    
    // Try a simpler approach - just test each table
    const tables = ['profiles', 'forum_threads', 'forum_posts', 'feed_posts'];
    
    for (const table of tables) {
      console.log(`\nTesting ${table}:`);
      
      // Try to query with service role (bypasses RLS)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('infinite recursion')) {
          console.log(`  ❌ INFINITE RECURSION DETECTED!`);
          console.log(`     Error: ${error.message}`);
        } else {
          console.log(`  ⚠️  Other error: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Table accessible (${data?.length || 0} rows)`);
      }
    }
  } else {
    console.log('📋 RLS Status:', rlsStatus);
  }

  // Now check for actual policies
  console.log('\n📊 Checking existing RLS policies...\n');
  
  const policiesQuery = `
    SELECT 
      tablename,
      policyname,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts')
    ORDER BY tablename, policyname;
  `;

  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: policiesQuery
  }).single();

  if (policiesError) {
    console.log('❌ Could not fetch policies:', policiesError.message);
  } else if (policies && policies.length > 0) {
    console.log('Found policies:', policies);
    
    // Analyze for circular references
    policies.forEach(policy => {
      if (policy.qual && policy.qual.includes('EXISTS') && policy.qual.includes('profiles')) {
        console.log(`\n⚠️  Potential circular reference in ${policy.tablename}.${policy.policyname}`);
        console.log(`   Policy: ${policy.qual}`);
      }
    });
  } else {
    console.log('⚠️  No policies found for these tables!');
  }

  console.log('\n🔧 SOLUTION: Need to fix or create non-recursive RLS policies');
  console.log('   - Avoid EXISTS subqueries that reference profiles from within profiles policies');
  console.log('   - Use direct column checks instead of subqueries where possible');
  console.log('   - Consider using security definer functions for complex checks');
}

// Run the check
checkRLSRecursion()
  .then(() => {
    console.log('\n✨ Recursion check complete!');
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    console.error('Stack:', error.stack);
  });