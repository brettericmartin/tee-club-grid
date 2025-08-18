#!/usr/bin/env node

import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

console.log('🔍 CURRENT RLS POLICIES STATUS');
console.log('=' .repeat(50));

async function checkTableRLSStatus() {
  const tables = [
    'profiles', 'feed_posts', 'feed_likes', 'user_follows', 
    'equipment_photos', 'user_bags', 'bag_equipment', 'equipment'
  ];

  for (const table of tables) {
    console.log(`\n📋 ${table.toUpperCase()}`);
    console.log('-'.repeat(30));

    try {
      // Check if table has RLS enabled and get policy info
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            t.tablename,
            t.rowsecurity as rls_enabled,
            p.policyname,
            p.cmd,
            p.roles,
            p.qual,
            p.with_check
          FROM pg_tables t
          LEFT JOIN pg_policies p ON p.tablename = t.tablename
          WHERE t.schemaname = 'public' 
          AND t.tablename = '${table}'
          ORDER BY p.cmd, p.policyname;
        `
      });

      if (error) {
        console.log(`❌ Error checking policies: ${error.message}`);
        
        // Fallback: Try simple query to check access
        const { data: testData, error: testError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (testError) {
          console.log(`   ❌ Table access: BLOCKED (${testError.message})`);
        } else {
          console.log(`   ✅ Table access: ALLOWED (${testData?.length || 0} records)`);
        }
      } else {
        if (data && data.length > 0) {
          const tableInfo = data[0];
          console.log(`   RLS Enabled: ${tableInfo.rls_enabled ? '✅ YES' : '❌ NO'}`);
          
          const policies = data.filter(row => row.policyname);
          if (policies.length > 0) {
            console.log(`   Policies: ${policies.length} found`);
            policies.forEach(policy => {
              console.log(`     - ${policy.policyname} (${policy.cmd}) for ${policy.roles}`);
            });
          } else {
            console.log(`   Policies: ⚠️  NO POLICIES FOUND`);
            if (tableInfo.rls_enabled) {
              console.log(`   ⚠️  WARNING: RLS enabled but no policies = NO ACCESS`);
            }
          }
        } else {
          console.log(`   ❌ No data returned for ${table}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }
}

async function testSpecificOperations() {
  console.log('\n🧪 TESTING SPECIFIC OPERATIONS');
  console.log('=' .repeat(40));

  // Test feed_likes INSERT
  console.log('\n📝 Testing feed_likes INSERT...');
  try {
    // Get a test post
    const { data: testPost } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();

    if (testPost) {
      // Try to insert a like
      const { data: insertResult, error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          post_id: testPost.id,
          user_id: 'test-user-id-' + Date.now()
        })
        .select();

      if (insertError) {
        console.log(`   ❌ INSERT failed: ${insertError.message}`);
        if (insertError.message.includes('row-level security')) {
          console.log(`   🔧 FIX NEEDED: Missing INSERT policy for authenticated users`);
        }
      } else {
        console.log(`   ✅ INSERT successful`);
        // Clean up
        if (insertResult && insertResult.length > 0) {
          await supabase
            .from('feed_likes')
            .delete()
            .eq('id', insertResult[0].id);
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }

  // Test user_follows INSERT
  console.log('\n👥 Testing user_follows INSERT...');
  try {
    const { data: insertResult, error: insertError } = await supabase
      .from('user_follows')
      .insert({
        follower_id: 'test-follower-' + Date.now(),
        following_id: 'test-following-' + Date.now()
      })
      .select();

    if (insertError) {
      console.log(`   ❌ INSERT failed: ${insertError.message}`);
      if (insertError.message.includes('row-level security')) {
        console.log(`   🔧 FIX NEEDED: Missing INSERT policy for authenticated users`);
      }
    } else {
      console.log(`   ✅ INSERT successful`);
      // Clean up
      if (insertResult && insertResult.length > 0) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('id', insertResult[0].id);
      }
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function main() {
  await checkTableRLSStatus();
  await testSpecificOperations();
  
  console.log('\n📋 SUMMARY');
  console.log('=' .repeat(30));
  console.log('1. Check which tables have RLS enabled vs disabled');
  console.log('2. Identify tables with no policies (blocking all access)');
  console.log('3. Test critical operations like INSERT on feed_likes');
  console.log('4. Use the comprehensive SQL fix if policies are missing');
}

main();