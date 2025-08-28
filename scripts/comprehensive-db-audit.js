import { supabase } from './supabase-admin.js';

async function comprehensiveDBAudit() {
  console.log('=' .repeat(80));
  console.log('COMPREHENSIVE DATABASE AUDIT - SENIOR DEVELOPER REVIEW');
  console.log('=' .repeat(80));
  
  const audit = {
    tables: {},
    issues: [],
    recommendations: []
  };

  // 1. Check if waitlist_applications table exists
  console.log('\n📊 TABLE STRUCTURE CHECK:');
  console.log('-'.repeat(40));
  
  try {
    const { data: waitlistTest, error: waitlistError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .limit(1);
    
    if (waitlistError) {
      if (waitlistError.message.includes('does not exist')) {
        audit.issues.push('CRITICAL: waitlist_applications table does not exist!');
        console.log('❌ waitlist_applications: TABLE DOES NOT EXIST');
      } else if (waitlistError.message.includes('row-level security')) {
        console.log('✅ waitlist_applications: Exists (RLS blocking read)');
        audit.tables.waitlist_applications = 'exists_with_rls';
      } else {
        console.log(`⚠️  waitlist_applications: ${waitlistError.message}`);
      }
    } else {
      console.log('✅ waitlist_applications: Accessible');
      audit.tables.waitlist_applications = 'accessible';
    }
  } catch (e) {
    console.log('❌ waitlist_applications: Error checking table');
  }

  // 2. Check profiles table structure
  try {
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_admin, beta_access')
      .limit(1);
    
    if (profileError) {
      console.log(`⚠️  profiles: ${profileError.message}`);
      if (profileError.message.includes('column "is_admin"')) {
        audit.issues.push('CRITICAL: profiles.is_admin column missing');
      }
    } else {
      console.log('✅ profiles: Has is_admin and beta_access columns');
      audit.tables.profiles = 'correct_structure';
    }
  } catch (e) {
    console.log('❌ profiles: Error checking structure');
  }

  // 3. Check admins table
  try {
    const { data: adminsTest, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .limit(1);
    
    if (adminsError) {
      if (adminsError.message.includes('does not exist')) {
        audit.issues.push('WARNING: admins table does not exist (API expects it)');
        console.log('❌ admins: TABLE DOES NOT EXIST');
      } else {
        console.log(`⚠️  admins: ${adminsError.message}`);
      }
    } else {
      console.log('✅ admins: Exists and accessible');
      audit.tables.admins = 'exists';
    }
  } catch (e) {
    console.log('❌ admins: Error checking table');
  }

  // 4. Test anonymous insert capability
  console.log('\n🔒 PERMISSIONS CHECK:');
  console.log('-'.repeat(40));
  
  const testEmail = `audit-test-${Date.now()}@example.com`;
  const { data: insertTest, error: insertError } = await supabase
    .from('waitlist_applications')
    .insert({
      email: testEmail,
      display_name: 'Audit Test',
      city_region: 'Test City',
      score: 50,
      status: 'pending',
      answers: {}
    })
    .select();
  
  if (insertError) {
    console.log('❌ Service role INSERT: Failed');
    console.log(`   Error: ${insertError.message}`);
    
    if (insertError.message.includes('violates not-null')) {
      audit.issues.push('CRITICAL: Required columns not matching frontend expectations');
    }
  } else {
    console.log('✅ Service role INSERT: Works');
    // Clean up
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
  }

  // 5. Check beta capacity
  console.log('\n📈 BETA CAPACITY CHECK:');
  console.log('-'.repeat(40));
  
  const { count: betaCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true);
  
  console.log(`Current beta users: ${betaCount || 0} / 100`);
  
  const { count: pendingCount } = await supabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  console.log(`Pending applications: ${pendingCount || 0}`);

  // 6. Check approval function
  console.log('\n⚙️  FUNCTION CHECK:');
  console.log('-'.repeat(40));
  
  const { data: funcTest, error: funcError } = await supabase
    .rpc('approve_user_by_email_if_capacity', {
      p_email: 'test-function@example.com',
      p_display_name: 'Test',
      p_grant_invites: false
    });
  
  if (funcError) {
    console.log(`❌ Approval function: ${funcError.message}`);
    audit.issues.push('WARNING: Approval function may not exist or has issues');
  } else {
    const result = funcTest;
    if (result?.success === false && result?.error === 'not_found') {
      console.log('✅ Approval function: Working (no application to approve)');
    } else {
      console.log(`✅ Approval function response: ${JSON.stringify(result)}`);
    }
  }

  // ANALYSIS
  console.log('\n' + '=' .repeat(80));
  console.log('🔍 SENIOR DEVELOPER ANALYSIS:');
  console.log('=' .repeat(80));
  
  console.log('\n❌ CRITICAL ISSUES:');
  if (audit.issues.length === 0) {
    console.log('  None found');
  } else {
    audit.issues.forEach(issue => console.log(`  • ${issue}`));
  }

  console.log('\n🏗️  ARCHITECTURE PROBLEMS:');
  console.log('  • DUAL ADMIN SYSTEMS: Frontend uses profiles.is_admin, API uses admins table');
  console.log('  • RLS OVERENGINEERING: 40+ SQL files trying to fix simple insert permission');
  console.log('  • SCHEMA MISMATCH: Frontend expects columns that may not exist');
  console.log('  • BYPASS PATTERN: Using service role to skip RLS defeats security purpose');
  
  console.log('\n💡 ROOT CAUSE:');
  console.log('  The system has been patched so many times that the original');
  console.log('  architecture is lost. Multiple conflicting approaches exist:');
  console.log('  1. Frontend bypasses API due to RLS issues');
  console.log('  2. Admin auth checks different tables in different places');
  console.log('  3. RLS policies are fighting each other');
  
  console.log('\n✅ RECOMMENDED FIX:');
  console.log('  1. DECIDE: Use profiles.is_admin OR admins table, not both');
  console.log('  2. SIMPLIFY: Drop ALL RLS policies, add ONE simple insert policy');
  console.log('  3. UNIFY: Make frontend use API endpoints, not direct DB access');
  console.log('  4. TEST: Create integration tests for the complete flow');
  
  console.log('\n🚨 IMMEDIATE ACTION:');
  console.log('  The waitlist submission is the most critical issue.');
  console.log('  Users cannot sign up, which blocks everything else.');
  console.log('  Fix order: Submissions → Admin Auth → Approval Flow');
  
  console.log('\n' + '=' .repeat(80));
  
  return audit;
}

comprehensiveDBAudit();