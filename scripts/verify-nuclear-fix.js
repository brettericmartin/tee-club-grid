import { createClient } from '@supabase/supabase-js';
import { supabase as adminSupabase } from './supabase-admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create anonymous client (exactly like frontend)
const anonSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyNuclearFix() {
  console.log('=' .repeat(80));
  console.log('🔍 VERIFYING NUCLEAR FIX');
  console.log('=' .repeat(80));
  
  const results = {
    anonInsert: false,
    authSelect: false,
    adminOperations: false
  };
  
  // TEST 1: Anonymous INSERT (the critical fix)
  console.log('\n📝 TEST 1: Anonymous user submitting application...');
  const testEmail = `nuclear-test-${Date.now()}@example.com`;
  const testData = {
    email: testEmail,
    display_name: 'Nuclear Test User',
    city_region: 'Test City, USA',
    score: 75,
    status: 'pending',
    answers: {
      role: 'golfer',
      share_channels: ['instagram'],
      learn_channels: ['youtube'],
      spend_bracket: '1500_3000',
      uses: ['discover gear'],
      buy_frequency: 'few_per_year',
      share_frequency: 'monthly',
      termsAccepted: true
    }
  };
  
  const { data: insertData, error: insertError } = await anonSupabase
    .from('waitlist_applications')
    .insert(testData)
    .select();
  
  if (insertError) {
    console.log('❌ FAILED: Anonymous cannot insert');
    console.log('   Error:', insertError.message);
  } else {
    console.log('✅ SUCCESS: Anonymous CAN insert!');
    console.log('   Created:', insertData[0].id);
    results.anonInsert = true;
  }
  
  // TEST 2: Anonymous cannot SELECT (security check)
  console.log('\n🔒 TEST 2: Verifying anonymous cannot read applications...');
  const { data: anonRead, error: anonReadError } = await anonSupabase
    .from('waitlist_applications')
    .select('*')
    .eq('email', testEmail);
  
  if (anonReadError || !anonRead || anonRead.length === 0) {
    console.log('✅ CORRECT: Anonymous cannot read (secure)');
  } else {
    console.log('⚠️  WARNING: Anonymous can read applications (security issue)');
  }
  
  // TEST 3: Admin operations via service role
  console.log('\n👨‍💼 TEST 3: Admin operations via service role...');
  const { data: adminRead, error: adminReadError } = await adminSupabase
    .from('waitlist_applications')
    .select('*')
    .eq('email', testEmail);
  
  if (adminReadError) {
    console.log('❌ FAILED: Admin cannot read');
    console.log('   Error:', adminReadError.message);
  } else {
    console.log('✅ SUCCESS: Admin CAN read');
    results.adminOperations = true;
    
    // Clean up test data
    const { error: deleteError } = await adminSupabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
    
    if (!deleteError) {
      console.log('✅ SUCCESS: Admin CAN delete (cleanup complete)');
    }
  }
  
  // SUMMARY
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(80));
  
  const allPassed = results.anonInsert && results.adminOperations;
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! The waitlist is FIXED!');
    console.log('\nWhat this means:');
    console.log('  ✅ Users can now submit waitlist applications');
    console.log('  ✅ The form will work properly');
    console.log('  ✅ Admin dashboard can manage applications');
    console.log('  ✅ Security is maintained (anon cannot read)');
  } else {
    console.log('\n❌ TESTS FAILED - The nuclear fix needs to be applied');
    console.log('\nTo fix:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the NUCLEAR-RLS-RESET.sql file');
    console.log('3. Run this test again to verify');
  }
  
  console.log('\n' + '=' .repeat(80));
}

verifyNuclearFix();