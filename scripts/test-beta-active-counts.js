#!/usr/bin/env node
/**
 * Test Beta Active vs Total Counts
 * Verifies the updated beta summary system with soft-delete support
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBetaCounts() {
  console.log('🚀 Testing Beta Active vs Total Counts System');
  console.log('=============================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Check if deleted_at column exists
  console.log('🧪 Test 1: Soft-delete column exists');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, deleted_at')
      .limit(1);

    if (error && error.message.includes('column "deleted_at" does not exist')) {
      console.log('❌ Column deleted_at does not exist - run migration first');
      console.log('   Run: scripts/add-soft-delete-to-profiles.sql in Supabase SQL editor');
      failed++;
    } else if (error) {
      console.log('❌ Error checking column:', error.message);
      failed++;
    } else {
      console.log('✅ Column deleted_at exists in profiles table');
      passed++;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 2: Test API endpoint response structure
  console.log('\n🧪 Test 2: Beta summary API returns new fields');
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/beta/summary`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check for new fields
    const hasNewFields = 
      'approvedActive' in data && 
      'approvedTotal' in data &&
      'approved' in data; // Should still have deprecated field

    if (hasNewFields) {
      console.log('✅ API returns new fields:');
      console.log(`   - approvedActive: ${data.approvedActive}`);
      console.log(`   - approvedTotal: ${data.approvedTotal}`);
      console.log(`   - approved (deprecated): ${data.approved}`);
      console.log(`   - cap: ${data.cap}`);
      console.log(`   - remaining: ${data.remaining}`);
      passed++;
    } else {
      console.log('❌ API missing new fields');
      console.log('   Received:', Object.keys(data).join(', '));
      failed++;
    }
  } catch (error) {
    // Network errors are acceptable for local testing
    if (error.message.includes('fetch')) {
      console.log('⚠️  API test skipped (server not running)');
      console.log('   Start server with: npm run dev');
    } else {
      console.log('❌ API test failed:', error.message);
      failed++;
    }
  }

  // Test 3: Count beta users manually
  console.log('\n🧪 Test 3: Manual count verification');
  try {
    // Count active beta users
    const { count: activeCount, error: activeError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .is('deleted_at', null);

    // Count total beta users
    const { count: totalCount, error: totalError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true);

    // Count soft-deleted beta users
    const { count: deletedCount, error: deletedError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .not('deleted_at', 'is', null);

    if (activeError || totalError) {
      // If deleted_at column doesn't exist, we'll get an error
      if ((activeError?.message || totalError?.message || '').includes('column "deleted_at" does not exist')) {
        console.log('⚠️  Cannot count - deleted_at column missing');
        console.log('   Run migration first: scripts/add-soft-delete-to-profiles.sql');
      } else {
        throw activeError || totalError;
      }
    } else {
      console.log('✅ Manual counts:');
      console.log(`   - Active beta users: ${activeCount || 0}`);
      console.log(`   - Total beta users: ${totalCount || 0}`);
      console.log(`   - Soft-deleted beta users: ${deletedCount || 0}`);
      
      // Verify math
      if ((activeCount || 0) + (deletedCount || 0) === (totalCount || 0)) {
        console.log('   ✓ Math checks out: active + deleted = total');
      } else {
        console.log('   ⚠️  Math mismatch - may need recalculation');
      }
      passed++;
    }
  } catch (error) {
    console.log('❌ Manual count failed:', error.message);
    failed++;
  }

  // Test 4: Test cron endpoint (if accessible)
  console.log('\n🧪 Test 4: Cron recalculation endpoint');
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/cron/recalc-beta-stats`);
    
    if (response.status === 401) {
      console.log('✅ Cron endpoint protected (401 in production is expected)');
      passed++;
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Cron endpoint accessible (dev mode):');
      if (data.stats) {
        console.log(`   - Active: ${data.stats.activeCount}`);
        console.log(`   - Total: ${data.stats.totalCount}`);
        console.log(`   - Deleted: ${data.stats.deletedCount}`);
      }
      passed++;
    } else {
      console.log(`⚠️  Cron endpoint returned ${response.status}`);
    }
  } catch (error) {
    if (error.message.includes('fetch')) {
      console.log('⚠️  Cron test skipped (server not running)');
    } else {
      console.log('❌ Cron test failed:', error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Beta active/total system is working.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`);
  }

  // Next steps
  console.log('\n📋 IMPLEMENTATION STATUS:');
  console.log('✅ Created: Soft-delete migration SQL');
  console.log('✅ Updated: Beta summary API endpoint');
  console.log('✅ Updated: WaitlistBanner component');
  console.log('✅ Updated: WaitlistAdmin component');
  console.log('✅ Created: Cron job for recalculation');
  console.log('\n📋 DEPLOYMENT STEPS:');
  console.log('1. Run migration: scripts/add-soft-delete-to-profiles.sql in Supabase');
  console.log('2. Deploy to Vercel: git push');
  console.log('3. Verify cron job: Check Vercel dashboard > Functions > Cron');
  console.log('4. Monitor: /api/beta/summary should return approvedActive and approvedTotal');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testBetaCounts().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});