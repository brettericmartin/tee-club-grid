#!/usr/bin/env node
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

console.log('================================================================================');
console.log('✅ FINAL WAITLIST SYSTEM VERIFICATION');
console.log('================================================================================\n');

async function runFinalTests() {
  let allPassed = true;
  const testEmail = `final-test-${Date.now()}@example.com`;
  
  try {
    // 1. Anonymous submission WITHOUT select (just like frontend)
    console.log('📋 Test 1: Anonymous Submission (Frontend Pattern)');
    const { error: submitError } = await supabaseAnon
      .from('waitlist_applications')
      .insert({
        email: testEmail,
        display_name: 'Final Test User',
        city_region: 'Test City, CA',
        status: 'pending',
        score: 85,
        answers: {
          role: 'golfer',
          spend_bracket: '3000_5000'
        }
      });
      // Note: NO .select() here - just insert
    
    if (submitError) {
      console.log(`   ❌ Failed: ${submitError.message}`);
      allPassed = false;
    } else {
      console.log('   ✅ Anonymous user can submit!');
    }
    
    // 2. Admin can view submissions
    console.log('\n📋 Test 2: Admin View Access');
    const { data: submissions, error: viewError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('email, status, score')
      .eq('email', testEmail);
    
    if (viewError) {
      console.log(`   ❌ Admin cannot view: ${viewError.message}`);
      allPassed = false;
    } else {
      console.log(`   ✅ Admin can view (found ${submissions.length} entries)`);
      if (submissions.length > 0) {
        console.log(`      Latest: ${submissions[0].email} - Score: ${submissions[0].score}`);
      }
    }
    
    // 3. Admin can approve
    console.log('\n📋 Test 3: Admin Approval');
    const { error: approveError } = await supabaseAdmin
      .from('waitlist_applications')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('email', testEmail);
    
    if (approveError) {
      console.log(`   ❌ Cannot approve: ${approveError.message}`);
      allPassed = false;
    } else {
      console.log('   ✅ Admin can approve applications');
    }
    
    // 4. Check beta system
    console.log('\n📋 Test 4: Beta System Status');
    const { count: betaUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const { count: totalApplications } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true });
    
    const { count: pending } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    console.log(`   ✅ Beta Users: ${betaUsers}/150`);
    console.log(`   ✅ Total Applications: ${totalApplications}`);
    console.log(`   ✅ Pending: ${pending}`);
    
    // 5. Cleanup
    console.log('\n📋 Test 5: Cleanup');
    const { error: cleanupError } = await supabaseAdmin
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
    
    if (cleanupError) {
      console.log(`   ⚠️  Cleanup issue: ${cleanupError.message}`);
    } else {
      console.log('   ✅ Test data cleaned');
    }
    
    // Summary
    console.log('\n================================================================================');
    console.log('📊 FINAL RESULTS');
    console.log('================================================================================\n');
    
    if (allPassed) {
      console.log('🎉 ALL SYSTEMS OPERATIONAL!');
      console.log('\n✅ Waitlist submission working');
      console.log('✅ Admin access working');
      console.log('✅ Beta system tracking working');
      console.log('\nYour beta system is ready for users!');
    } else {
      console.log('⚠️  Some issues remain');
      console.log('Review the errors above');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    allPassed = false;
  }
  
  process.exit(allPassed ? 0 : 1);
}

runFinalTests();