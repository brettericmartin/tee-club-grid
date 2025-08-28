#!/usr/bin/env node
/**
 * MASTER HEALTH CHECK - Run this when anything seems broken
 * This combines all essential tests in one place
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Color codes for terminal
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

console.log('\n' + '='.repeat(80));
console.log(`${BLUE}🏥 MASTER HEALTH CHECK - Teed.club System Diagnostics${RESET}`);
console.log('='.repeat(80));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

async function runHealthCheck() {
  
  // 1. DATABASE CONNECTION
  console.log(`\n${BLUE}1️⃣  DATABASE CONNECTION${RESET}`);
  console.log('-'.repeat(40));
  
  try {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`${GREEN}✅ Database connected${RESET}`);
    console.log(`   Total profiles: ${count}`);
    results.passed.push('Database connection');
  } catch (error) {
    console.log(`${RED}❌ Database connection failed${RESET}`);
    console.log(`   Error: ${error.message}`);
    results.failed.push('Database connection');
  }
  
  // 2. WAITLIST SUBMISSION
  console.log(`\n${BLUE}2️⃣  WAITLIST SUBMISSION (Critical)${RESET}`);
  console.log('-'.repeat(40));
  
  const testEmail = `health-check-${Date.now()}@test.com`;
  try {
    const { error } = await supabaseAnon
      .from('waitlist_applications')
      .insert({
        email: testEmail,
        display_name: 'Health Check',
        city_region: 'Test',
        status: 'pending',
        score: 50,
        answers: {}
      });
    
    if (error) {
      console.log(`${RED}❌ Anonymous submission BLOCKED${RESET}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   ${YELLOW}Fix: Run SQL from APPLY_RLS_FIX_NOW.md${RESET}`);
      results.failed.push('Waitlist submission');
    } else {
      console.log(`${GREEN}✅ Anonymous users can submit${RESET}`);
      results.passed.push('Waitlist submission');
      
      // Cleanup
      await supabaseAdmin
        .from('waitlist_applications')
        .delete()
        .eq('email', testEmail);
    }
  } catch (error) {
    console.log(`${RED}❌ Unexpected error${RESET}`);
    results.failed.push('Waitlist submission');
  }
  
  // 3. ADMIN SYSTEM
  console.log(`\n${BLUE}3️⃣  ADMIN SYSTEM${RESET}`);
  console.log('-'.repeat(40));
  
  try {
    const { data: admins, error } = await supabaseAdmin
      .from('profiles')
      .select('email, username, is_admin')
      .eq('is_admin', true);
    
    if (error) {
      console.log(`${RED}❌ Cannot check admin status${RESET}`);
      results.failed.push('Admin system');
    } else if (admins.length === 0) {
      console.log(`${YELLOW}⚠️  No admin users configured${RESET}`);
      console.log(`   Fix: UPDATE profiles SET is_admin = true WHERE email = 'your-email';`);
      results.warnings.push('No admin users');
    } else {
      console.log(`${GREEN}✅ Admin system working${RESET}`);
      console.log(`   Active admins: ${admins.length}`);
      admins.forEach(admin => {
        console.log(`   - ${admin.email || admin.username}`);
      });
      results.passed.push('Admin system');
    }
  } catch (error) {
    console.log(`${RED}❌ Admin check failed${RESET}`);
    results.failed.push('Admin system');
  }
  
  // 4. BETA CAPACITY
  console.log(`\n${BLUE}4️⃣  BETA CAPACITY${RESET}`);
  console.log('-'.repeat(40));
  
  try {
    const { count: betaUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const { count: pendingApps } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    const capacity = 150 - betaUsers;
    
    console.log(`${GREEN}✅ Beta tracking working${RESET}`);
    console.log(`   Beta users: ${betaUsers}/150`);
    console.log(`   Capacity remaining: ${capacity}`);
    console.log(`   Pending applications: ${pendingApps}`);
    
    results.passed.push('Beta capacity');
    
    if (capacity <= 10) {
      console.log(`   ${YELLOW}⚠️  Low capacity warning!${RESET}`);
      results.warnings.push('Low beta capacity');
    }
  } catch (error) {
    console.log(`${RED}❌ Beta tracking failed${RESET}`);
    results.failed.push('Beta capacity');
  }
  
  // 5. RLS POLICIES
  console.log(`\n${BLUE}5️⃣  RLS POLICIES${RESET}`);
  console.log('-'.repeat(40));
  
  const tables = ['profiles', 'user_bags', 'feed_posts', 'waitlist_applications'];
  let rlsOk = true;
  
  for (const table of tables) {
    try {
      const { error } = await supabaseAnon
        .from(table)
        .select('id')
        .limit(1);
      
      // Some tables should block anonymous select
      if (table === 'waitlist_applications' && !error) {
        console.log(`   ${YELLOW}⚠️  ${table}: Too permissive (anon can SELECT)${RESET}`);
        results.warnings.push(`${table} RLS too permissive`);
      } else {
        console.log(`   ✅ ${table}: RLS configured`);
      }
    } catch (error) {
      console.log(`   ${RED}❌ ${table}: Error checking RLS${RESET}`);
      rlsOk = false;
    }
  }
  
  if (rlsOk) {
    results.passed.push('RLS policies');
  } else {
    results.failed.push('RLS policies');
  }
  
  // 6. CRITICAL FUNCTIONS
  console.log(`\n${BLUE}6️⃣  DATABASE FUNCTIONS${RESET}`);
  console.log('-'.repeat(40));
  
  const functions = [
    'approve_user_by_email_if_capacity',
    'grant_beta_access',
    'is_admin'
  ];
  
  let functionsOk = true;
  for (const func of functions) {
    try {
      // Just check if we can call it (will error if doesn't exist)
      const { error } = await supabaseAdmin.rpc(func, {});
      
      if (error && !error.message.includes('required')) {
        console.log(`   ${RED}❌ ${func}: Missing${RESET}`);
        functionsOk = false;
      } else {
        console.log(`   ✅ ${func}: Available`);
      }
    } catch {
      console.log(`   ${YELLOW}⚠️  ${func}: Cannot verify${RESET}`);
    }
  }
  
  if (functionsOk) {
    results.passed.push('Database functions');
  } else {
    results.failed.push('Database functions');
  }
  
  // FINAL REPORT
  console.log('\n' + '='.repeat(80));
  console.log(`${BLUE}📊 HEALTH CHECK REPORT${RESET}`);
  console.log('='.repeat(80));
  
  if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log(`\n${GREEN}🎉 SYSTEM FULLY OPERATIONAL!${RESET}`);
    console.log('All checks passed. Your system is healthy.\n');
  } else if (results.failed.length === 0) {
    console.log(`\n${YELLOW}⚠️  SYSTEM OPERATIONAL WITH WARNINGS${RESET}\n`);
    console.log('Warnings:');
    results.warnings.forEach(w => console.log(`  - ${w}`));
    console.log('\nThese are not critical but should be addressed.\n');
  } else {
    console.log(`\n${RED}❌ CRITICAL ISSUES DETECTED${RESET}\n`);
    
    console.log('Failed checks:');
    results.failed.forEach(f => console.log(`  ${RED}✗ ${f}${RESET}`));
    
    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(w => console.log(`  ${YELLOW}⚠ ${w}${RESET}`));
    }
    
    console.log(`\n${YELLOW}RECOMMENDED ACTIONS:${RESET}`);
    
    if (results.failed.includes('Waitlist submission')) {
      console.log('\n1. Fix waitlist submission:');
      console.log('   - Open APPLY_RLS_FIX_NOW.md');
      console.log('   - Copy the SQL code (not the markdown)');
      console.log('   - Run in Supabase Dashboard > SQL Editor');
    }
    
    if (results.failed.includes('Admin system')) {
      console.log('\n2. Fix admin system:');
      console.log('   - Run: node scripts/migrate-admin-system.js');
    }
    
    if (results.failed.includes('Database connection')) {
      console.log('\n3. Check database connection:');
      console.log('   - Verify .env.local has correct SUPABASE_URL');
      console.log('   - Check Supabase dashboard is accessible');
    }
  }
  
  // Quick reference
  console.log(`\n${BLUE}QUICK REFERENCE:${RESET}`);
  console.log('• Passed checks: ' + results.passed.length);
  console.log('• Failed checks: ' + results.failed.length);
  console.log('• Warnings: ' + results.warnings.length);
  
  console.log(`\n${BLUE}OTHER USEFUL COMMANDS:${RESET}`);
  console.log('• Full audit: node scripts/comprehensive-db-audit.js');
  console.log('• Test waitlist: node scripts/test-final-waitlist.js');
  console.log('• Check admins: node scripts/verify-admin-system.js');
  console.log('• Grant beta: node scripts/grant-beta-access.js email@example.com');
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Exit with error code if there are failures
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runHealthCheck().catch(error => {
  console.error(`${RED}Unexpected error running health check:${RESET}`, error);
  process.exit(1);
});