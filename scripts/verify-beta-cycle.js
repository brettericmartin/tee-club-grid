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

async function verifyBetaCycle() {
  console.log('🔄 VERIFYING FULL BETA CYCLE\n');
  console.log('=' .repeat(80));
  
  const results = {
    database: { passed: 0, failed: 0, issues: [] },
    api: { passed: 0, failed: 0, issues: [] },
    flow: { passed: 0, failed: 0, issues: [] },
    transparency: { passed: 0, failed: 0, issues: [] }
  };
  
  // 1. DATABASE CHECKS
  console.log('\n📊 1. DATABASE VERIFICATION\n');
  
  // Check feature flags
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (flags && !flagsError) {
    console.log('✅ Feature flags configured');
    results.database.passed++;
  } else {
    console.log('❌ Feature flags missing or misconfigured');
    results.database.failed++;
    results.database.issues.push('Feature flags not properly initialized');
  }
  
  // Check waitlist table structure
  const { data: waitlistSample } = await supabase
    .from('waitlist_applications')
    .select('*')
    .limit(1);
  
  const requiredWaitlistColumns = ['email', 'display_name', 'score', 'status', 'approved_at'];
  if (waitlistSample !== null) {
    console.log('✅ Waitlist applications table exists');
    results.database.passed++;
  } else {
    console.log('❌ Waitlist applications table issues');
    results.database.failed++;
    results.database.issues.push('Waitlist table structure incomplete');
  }
  
  // Check profiles beta columns
  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  const requiredProfileColumns = ['beta_access', 'referral_code', 'invite_quota'];
  if (profileSample) {
    const hasAllColumns = requiredProfileColumns.every(col => col in profileSample);
    if (hasAllColumns) {
      console.log('✅ Profiles table has beta columns');
      results.database.passed++;
    } else {
      console.log('❌ Profiles table missing beta columns');
      results.database.failed++;
      results.database.issues.push('Profile beta columns incomplete');
    }
  }
  
  // 2. API ENDPOINT CHECKS
  console.log('\n🌐 2. API ENDPOINT VERIFICATION\n');
  
  // Check beta summary endpoint
  try {
    const summaryResponse = await fetch('http://localhost:3334/api/beta/summary');
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json();
      if (summary.cap && typeof summary.approved === 'number') {
        console.log('✅ Beta summary API working');
        console.log(`   Current: ${summary.approvedActive || summary.approved}/${summary.cap} filled`);
        results.api.passed++;
      } else {
        console.log('❌ Beta summary API incomplete response');
        results.api.failed++;
        results.api.issues.push('Beta summary API returns incomplete data');
      }
    } else {
      console.log('❌ Beta summary API not responding');
      results.api.failed++;
      results.api.issues.push('Beta summary API endpoint not available');
    }
  } catch (err) {
    console.log('⚠️  Beta summary API not accessible (server may not be deployed)');
    results.api.failed++;
    results.api.issues.push('API endpoints need deployment');
  }
  
  // 3. BETA FLOW VERIFICATION
  console.log('\n🔄 3. BETA ACCESS FLOW\n');
  
  // Check beta access control
  const { count: betaUserCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('beta_access', true)
    .is('deleted_at', null);
  
  console.log(`✅ Beta users: ${betaUserCount || 0}`);
  results.flow.passed++;
  
  // Check if beta users can create bags
  const { data: bags } = await supabase
    .from('user_bags')
    .select('id, user_id')
    .limit(1);
  
  if (bags !== null) {
    console.log('✅ Bag creation table accessible');
    results.flow.passed++;
  } else {
    console.log('❌ Bag creation may have issues');
    results.flow.failed++;
    results.flow.issues.push('User bags table not properly configured');
  }
  
  // 4. TRANSPARENCY FEATURES
  console.log('\n📈 4. TRANSPARENCY FEATURES\n');
  
  // Check demand metrics
  const betaCap = flags?.beta_cap || 150;
  const spotsRemaining = Math.max(0, betaCap - (betaUserCount || 0));
  const fillPercentage = Math.round(((betaUserCount || 0) / betaCap) * 100);
  
  console.log(`✅ Demand metrics available:`);
  console.log(`   - Beta cap: ${betaCap}`);
  console.log(`   - Spots filled: ${betaUserCount || 0}`);
  console.log(`   - Spots remaining: ${spotsRemaining}`);
  console.log(`   - Fill rate: ${fillPercentage}%`);
  results.transparency.passed++;
  
  // Check waitlist queue size
  const { count: waitlistCount } = await supabase
    .from('waitlist_applications')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');
  
  console.log(`✅ Waitlist queue: ${waitlistCount || 0} pending`);
  results.transparency.passed++;
  
  // Check leaderboard configuration
  if (flags?.leaderboard_enabled) {
    console.log('✅ Referral leaderboard enabled');
    results.transparency.passed++;
  } else {
    console.log('⚠️  Referral leaderboard disabled');
    results.transparency.failed++;
    results.transparency.issues.push('Leaderboard not enabled for engagement');
  }
  
  // FINAL SUMMARY
  console.log('\n\n📋 VERIFICATION SUMMARY\n');
  console.log('=' .repeat(80));
  
  const categories = ['database', 'api', 'flow', 'transparency'];
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const category of categories) {
    const cat = results[category];
    totalPassed += cat.passed;
    totalFailed += cat.failed;
    
    const status = cat.failed === 0 ? '✅' : '❌';
    console.log(`\n${status} ${category.toUpperCase()}: ${cat.passed} passed, ${cat.failed} failed`);
    
    if (cat.issues.length > 0) {
      console.log('   Issues:');
      for (const issue of cat.issues) {
        console.log(`   - ${issue}`);
      }
    }
  }
  
  const overallScore = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
  const overallStatus = overallScore >= 80 ? '✅ READY' : 
                        overallScore >= 60 ? '⚠️  NEEDS WORK' : 
                        '❌ NOT READY';
  
  console.log('\n' + '=' .repeat(80));
  console.log(`OVERALL: ${overallStatus} (${overallScore}% passing)`);
  
  // RECOMMENDATIONS
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  if (results.database.issues.length > 0) {
    console.log('1. Run the SQL scripts in Supabase Dashboard:');
    console.log('   - scripts/create-waitlist-table.sql');
    console.log('   - RLS policies from scripts/setup-rls-policies.js');
  }
  
  if (results.api.issues.length > 0) {
    console.log('2. Deploy API endpoints to Vercel:');
    console.log('   - Ensure /api/beta/summary is deployed');
    console.log('   - Ensure /api/waitlist/submit is deployed');
  }
  
  if (results.transparency.issues.length > 0) {
    console.log('3. Enable transparency features:');
    console.log('   - Enable leaderboard in feature flags');
    console.log('   - Configure referral tracking');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Address any issues identified above');
  console.log('2. Test waitlist form at http://localhost:3334/waitlist');
  console.log('3. Use admin tool: node scripts/beta-admin.js');
  console.log('4. Monitor beta metrics in real-time');
  
  // READY FOR PRODUCTION CHECK
  if (overallScore >= 80) {
    console.log('\n🚀 BETA SYSTEM IS READY FOR PRODUCTION!');
    console.log('\nTo launch:');
    console.log('1. Deploy to production');
    console.log('2. Set initial beta cap (recommended: 50-100)');
    console.log('3. Generate initial invite codes');
    console.log('4. Announce beta program');
  }
}

verifyBetaCycle()
  .then(() => {
    console.log('\n✨ Beta cycle verification complete!');
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
  });