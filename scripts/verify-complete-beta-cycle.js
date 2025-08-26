import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyCompleteBetaCycle() {
  console.log('🔄 COMPLETE BETA CYCLE VERIFICATION\n');
  console.log('=' .repeat(80));
  
  const checks = {
    schema: { passed: 0, failed: 0, details: [] },
    flow: { passed: 0, failed: 0, details: [] },
    admin: { passed: 0, failed: 0, details: [] },
    transparency: { passed: 0, failed: 0, details: [] }
  };
  
  // 1. SCHEMA VERIFICATION
  console.log('\n📊 1. DATABASE SCHEMA CHECK\n');
  
  // Check waitlist_applications table
  const { data: waitlistSample } = await supabase
    .from('waitlist_applications')
    .select('*')
    .limit(1);
  
  if (waitlistSample !== null) {
    console.log('✅ waitlist_applications table exists');
    checks.schema.passed++;
    
    // Check required columns
    if (waitlistSample.length > 0) {
      const required = ['email', 'display_name', 'score', 'status', 'created_at'];
      const cols = Object.keys(waitlistSample[0]);
      const missing = required.filter(r => !cols.includes(r));
      
      if (missing.length === 0) {
        console.log('✅ All required columns present');
        checks.schema.passed++;
      } else {
        console.log(`❌ Missing columns: ${missing.join(', ')}`);
        checks.schema.failed++;
        checks.schema.details.push(`Missing columns: ${missing.join(', ')}`);
      }
    }
  } else {
    console.log('❌ waitlist_applications table not accessible');
    checks.schema.failed++;
    checks.schema.details.push('waitlist_applications table not accessible');
  }
  
  // Check profiles beta columns
  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  if (profileSample) {
    const betaCols = ['beta_access', 'referral_code', 'invite_quota'];
    const hasBetaCols = betaCols.every(col => col in profileSample);
    
    if (hasBetaCols) {
      console.log('✅ Profiles has beta columns');
      checks.schema.passed++;
    } else {
      console.log('❌ Profiles missing beta columns');
      checks.schema.failed++;
      checks.schema.details.push('Profiles missing beta columns');
    }
  }
  
  // Check feature flags
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (flags && flags.beta_cap) {
    console.log('✅ Feature flags configured');
    checks.schema.passed++;
  } else {
    console.log('❌ Feature flags not configured');
    checks.schema.failed++;
    checks.schema.details.push('Feature flags not configured');
  }
  
  // 2. FLOW VERIFICATION
  console.log('\n🔄 2. BETA FLOW CHECK\n');
  
  // Check pending applications exist
  const { count: pendingCount } = await supabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  console.log(`Pending applications: ${pendingCount || 0}`);
  if (pendingCount !== null && pendingCount >= 0) {
    console.log('✅ Can query pending applications');
    checks.flow.passed++;
  } else {
    console.log('❌ Cannot query pending applications');
    checks.flow.failed++;
    checks.flow.details.push('Cannot query pending applications');
  }
  
  // Check approved users
  const { count: approvedCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true)
    .is('deleted_at', null);
  
  console.log(`Approved beta users: ${approvedCount || 0}`);
  if (approvedCount !== null && approvedCount >= 0) {
    console.log('✅ Can query beta users');
    checks.flow.passed++;
  } else {
    console.log('❌ Cannot query beta users');
    checks.flow.failed++;
    checks.flow.details.push('Cannot query beta users');
  }
  
  // Check referral codes exist
  const { data: referralUsers } = await supabase
    .from('profiles')
    .select('referral_code')
    .not('referral_code', 'is', null)
    .limit(5);
  
  if (referralUsers && referralUsers.length > 0) {
    console.log(`✅ ${referralUsers.length} users have referral codes`);
    checks.flow.passed++;
  } else {
    console.log('⚠️  No users have referral codes yet');
    checks.flow.failed++;
    checks.flow.details.push('No referral codes generated');
  }
  
  // 3. ADMIN FUNCTIONALITY
  console.log('\n👤 3. ADMIN DASHBOARD CHECK\n');
  
  // Check if admin can see applications
  const { data: recentApps } = await supabase
    .from('waitlist_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recentApps && recentApps.length > 0) {
    console.log(`✅ Admin can see ${recentApps.length} recent applications`);
    checks.admin.passed++;
    
    const pending = recentApps.filter(a => a.status === 'pending');
    if (pending.length > 0) {
      console.log(`✅ ${pending.length} pending applications visible`);
      checks.admin.passed++;
    } else {
      console.log('⚠️  No pending applications to review');
    }
  } else {
    console.log('❌ No applications visible to admin');
    checks.admin.failed++;
    checks.admin.details.push('No applications visible');
  }
  
  // 4. TRANSPARENCY FEATURES
  console.log('\n📈 4. TRANSPARENCY CHECK\n');
  
  const betaCap = flags?.beta_cap || 150;
  const spotsRemaining = Math.max(0, betaCap - (approvedCount || 0));
  const fillRate = Math.round(((approvedCount || 0) / betaCap) * 100);
  
  console.log(`Beta capacity: ${betaCap}`);
  console.log(`Spots filled: ${approvedCount || 0}`);
  console.log(`Spots remaining: ${spotsRemaining}`);
  console.log(`Fill rate: ${fillRate}%`);
  
  if (betaCap && approvedCount !== null) {
    console.log('✅ Transparency metrics available');
    checks.transparency.passed++;
  } else {
    console.log('❌ Transparency metrics not available');
    checks.transparency.failed++;
    checks.transparency.details.push('Metrics not available');
  }
  
  // SUMMARY
  console.log('\n\n📋 VERIFICATION SUMMARY\n');
  console.log('=' .repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [category, results] of Object.entries(checks)) {
    totalPassed += results.passed;
    totalFailed += results.failed;
    
    const status = results.failed === 0 ? '✅' : '❌';
    console.log(`\n${status} ${category.toUpperCase()}: ${results.passed} passed, ${results.failed} failed`);
    
    if (results.details.length > 0) {
      console.log('  Issues:');
      for (const detail of results.details) {
        console.log(`    - ${detail}`);
      }
    }
  }
  
  const overallScore = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
  const overallStatus = overallScore === 100 ? '✅ PERFECT' :
                        overallScore >= 90 ? '✅ READY' :
                        overallScore >= 70 ? '⚠️  MOSTLY READY' :
                        '❌ NEEDS WORK';
  
  console.log('\n' + '=' .repeat(80));
  console.log(`OVERALL: ${overallStatus} (${overallScore}% passing)`);
  
  // LIFECYCLE FLOWS
  console.log('\n🔄 BETA LIFECYCLE FLOWS:\n');
  
  console.log('1. STANDARD APPLICATION FLOW:');
  console.log('   User visits /waitlist');
  console.log('   → Fills form (score calculated)');
  console.log('   → Score >= 75: Auto-approved ✅');
  console.log('   → Score < 75: Pending (admin review needed)');
  console.log('   → Admin approves in dashboard');
  console.log('   → User gets beta_access = true');
  console.log('   → Can build bag at /my-bag');
  
  console.log('\n2. REFERRAL FLOW:');
  console.log('   User shares: /waitlist?ref=THEIRCODE');
  console.log('   → New user clicks link');
  console.log('   → Referral code auto-fills');
  console.log('   → Submission tracks referrer');
  console.log('   → Referrer gets credit');
  
  console.log('\n3. INVITE CODE FLOW:');
  console.log('   Admin generates invite code');
  console.log('   → Shares: /waitlist?code=INVITECODE');
  console.log('   → User clicks link');
  console.log('   → Invite code auto-fills');
  console.log('   → Submission = instant approval ✅');
  
  console.log('\n🎯 CURRENT STATUS:');
  console.log(`   • ${pendingCount || 0} users waiting for approval`);
  console.log(`   • ${approvedCount || 0} users have beta access`);
  console.log(`   • ${spotsRemaining} spots remaining`);
  console.log(`   • ${referralUsers?.length || 0} users can refer others`);
}

verifyCompleteBetaCycle()
  .then(() => {
    console.log('\n✨ Verification complete!');
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
  });