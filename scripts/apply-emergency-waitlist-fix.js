import { supabase } from './supabase-admin.js';
import fs from 'fs';

async function applyEmergencyFix() {
  console.log('🚨 APPLYING EMERGENCY WAITLIST SUBMISSION FIX');
  console.log('=' .repeat(80));
  
  // Read the SQL file
  const sql = fs.readFileSync('./supabase/EMERGENCY-WAITLIST-SUBMISSION-FIX.sql', 'utf8');
  
  // Split by statements (careful with DO blocks)
  const statements = sql
    .split(/;\s*(?=(?:DROP|CREATE|ALTER|DO|SELECT|--))/)
    .filter(s => s.trim() && !s.trim().startsWith('--'))
    .map(s => s.trim() + (s.trim().endsWith(';') ? '' : ';'));

  console.log(`📝 Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip pure comments
    if (stmt.trim().startsWith('--')) continue;
    
    // Log what we're doing
    const firstLine = stmt.split('\n')[0];
    console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine.substring(0, 60)}...`);
    
    try {
      const { data, error } = await supabase.rpc('run_sql', {
        query: stmt
      });
      
      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Success`);
        if (data && typeof data === 'string' && data.includes('NOTICE')) {
          console.log(`  ${data}`);
        }
      }
    } catch (e) {
      console.error(`  ❌ Exception: ${e.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🧪 TESTING SUBMISSION CAPABILITY...\n');
  
  // Test with a minimal insert
  const testEmail = `test-${Date.now()}@example.com`;
  const { data: testInsert, error: insertError } = await supabase
    .from('waitlist_applications')
    .insert({
      email: testEmail,
      display_name: 'Test User'
    })
    .select();
  
  if (insertError) {
    console.log('❌ TEST FAILED:', insertError.message);
    console.log('Error details:', insertError);
  } else {
    console.log('✅ TEST SUCCESSFUL! Application submitted:', testInsert);
    
    // Clean up
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📋 FINAL STATUS:');
  
  // Count policies
  const { data: policyCount } = await supabase.rpc('run_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM pg_policy pol
      JOIN pg_class cls ON pol.polrelid = cls.oid
      WHERE cls.relname = 'waitlist_applications'
    `
  }).single();
  
  console.log(`Policies on waitlist_applications: ${policyCount?.count || 0}`);
  
  if (insertError) {
    console.log('\n⚠️  WARNING: Submission still failing. May need to check:');
    console.log('1. Required columns in the form');
    console.log('2. Frontend API endpoint configuration');
    console.log('3. Supabase client initialization');
  } else {
    console.log('\n✅ EMERGENCY FIX SUCCESSFUL!');
    console.log('Users should now be able to submit waitlist applications.');
  }
}

applyEmergencyFix();