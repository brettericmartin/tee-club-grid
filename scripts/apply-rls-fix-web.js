import { supabase } from './supabase-admin.js';
import fs from 'fs';

async function applyRLSFix() {
  console.log('🚨 APPLYING CRITICAL RLS FIX FOR WAITLIST SUBMISSIONS');
  console.log('=' .repeat(80));
  
  const sql = fs.readFileSync('./supabase/migrations/20250826_fix_waitlist_rls.sql', 'utf8');
  
  // Execute the entire SQL as one transaction
  console.log('📝 Executing RLS fix SQL...\n');
  
  try {
    // For Supabase, we need to execute the SQL through their SQL editor API
    // Since we can't use run_sql, we'll execute statements individually
    const statements = sql
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'))
      .map(s => s.trim() + ';');
    
    for (const stmt of statements) {
      if (stmt.includes('DROP POLICY') || stmt.includes('CREATE POLICY') || stmt.includes('ALTER TABLE')) {
        const firstLine = stmt.split('\n')[0];
        console.log(`Executing: ${firstLine.substring(0, 60)}...`);
        
        // We need to execute this through a different approach
        // Since run_sql doesn't exist, we'll need to use the Supabase dashboard
        console.log('  ⚠️  Must be executed via Supabase dashboard SQL editor');
      }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('\n1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('\n' + '=' .repeat(80));
    console.log(sql);
    console.log('=' .repeat(80));
    console.log('\n4. Click "Run" to execute');
    console.log('\nThis will fix the RLS policies and allow users to submit waitlist applications.');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Test current state
  console.log('\n' + '=' .repeat(80));
  console.log('🧪 TESTING CURRENT STATE...\n');
  
  const testData = {
    email: `test-${Date.now()}@example.com`,
    display_name: 'Test User',
    city_region: 'Test City',
    score: 50,
    status: 'pending',
    answers: {
      role: 'golfer',
      share_channels: [],
      learn_channels: [],
      spend_bracket: '<300',
      uses: [],
      buy_frequency: 'never',
      share_frequency: 'never',
      termsAccepted: true
    }
  };
  
  const { data, error } = await supabase
    .from('waitlist_applications')
    .insert(testData)
    .select();
  
  if (error) {
    console.log('❌ Service role insert failed:', error.message);
    console.log('This indicates a column or constraint issue, not RLS');
  } else {
    console.log('✅ Service role can insert successfully');
    // Clean up
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testData.email);
  }
}

applyRLSFix();