#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create client exactly like frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================================');
console.log('🧪 TESTING FRONTEND WAITLIST SUBMISSION');
console.log('================================================================================\n');

async function testSubmission() {
  try {
    // Test 1: Simple insert (like RLS check does)
    console.log('📋 Test 1: Simple INSERT');
    const simpleData = {
      email: `simple-test-${Date.now()}@example.com`,
      display_name: 'Simple Test',
      city_region: 'Test City',
      status: 'pending',
      score: 50,
      answers: {}
    };
    
    const { error: simpleError } = await supabase
      .from('waitlist_applications')
      .insert(simpleData);
    
    if (simpleError) {
      console.log(`   ❌ Failed: ${simpleError.message}`);
    } else {
      console.log('   ✅ Success!');
      // Clean up
      await supabase.from('waitlist_applications').delete().eq('email', simpleData.email);
    }
    
    // Test 2: Complex insert (like frontend does)
    console.log('\n📋 Test 2: Complex INSERT (Frontend style)');
    const complexData = {
      email: `complex-test-${Date.now()}@example.com`,
      display_name: 'Complex Test User',
      city_region: 'San Francisco, CA',
      score: 75,
      status: 'pending',
      answers: {
        role: 'golfer',
        share_channels: ['instagram', 'reddit'],
        learn_channels: ['youtube'],
        spend_bracket: '1500_3000',
        uses: ['discover gear', 'share setup'],
        buy_frequency: 'few_per_year',
        share_frequency: 'monthly',
        termsAccepted: true
      }
    };
    
    const { error: complexError } = await supabase
      .from('waitlist_applications')
      .insert(complexData);
    
    if (complexError) {
      console.log(`   ❌ Failed: ${complexError.message}`);
      console.log(`   Error code: ${complexError.code}`);
    } else {
      console.log('   ✅ Success!');
      // Clean up
      await supabase.from('waitlist_applications').delete().eq('email', complexData.email);
    }
    
    // Test 3: Check if we can SELECT as anonymous
    console.log('\n📋 Test 3: Anonymous SELECT');
    const { data: selectData, error: selectError } = await supabase
      .from('waitlist_applications')
      .select('id, status')
      .limit(1);
    
    if (selectError) {
      console.log(`   ❌ Cannot SELECT: ${selectError.message}`);
    } else {
      console.log(`   ✅ Can SELECT (found ${selectData?.length || 0} rows)`);
    }
    
    // Test 4: Try the actual frontend service function
    console.log('\n📋 Test 4: Using Frontend Service');
    
    // Import the actual service
    const waitlistService = await import('../src/services/waitlistService.js').catch(() => null);
    
    if (waitlistService?.submitWaitlistApplication) {
      const serviceData = {
        email: `service-test-${Date.now()}@example.com`,
        display_name: 'Service Test',
        city_region: 'Test City',
        role: 'golfer',
        spend_bracket: '1500_3000',
        buy_frequency: 'monthly',
        share_frequency: 'weekly',
        termsAccepted: true
      };
      
      try {
        const result = await waitlistService.submitWaitlistApplication(serviceData);
        if (result.error) {
          console.log(`   ❌ Service failed: ${result.error.message}`);
        } else {
          console.log('   ✅ Service submission worked!');
          // Clean up
          await supabase.from('waitlist_applications').delete().eq('email', serviceData.email);
        }
      } catch (e) {
        console.log(`   ❌ Service error: ${e.message}`);
      }
    } else {
      console.log('   ⚠️  Could not load frontend service');
    }
    
    // Summary
    console.log('\n================================================================================');
    console.log('📊 RESULTS');
    console.log('================================================================================\n');
    
    console.log('If simple INSERT works but complex fails, the issue might be:');
    console.log('  - Column type mismatch (answers field)');
    console.log('  - Missing columns in the table');
    console.log('  - Data validation rules');
    
    console.log('\nNext steps:');
    console.log('  1. Check table schema for waitlist_applications');
    console.log('  2. Verify answers column accepts JSONB');
    console.log('  3. Check for any triggers or constraints');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testSubmission();