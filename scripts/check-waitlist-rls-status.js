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
console.log('🔒 WAITLIST RLS POLICY STATUS CHECK');
console.log('================================================================================\n');

async function checkRLSStatus() {
  try {
    // Test with different clients
    console.log('📋 Testing INSERT operations:\n');
    
    const testData = {
      email: `rls-test-${Date.now()}@example.com`,
      display_name: 'RLS Test',
      city_region: 'Test City',
      status: 'pending',
      score: 50,
      answers: {}
    };
    
    // 1. Test with anon client
    console.log('1️⃣  Anonymous client (anon key):');
    const { error: anonError } = await supabaseAnon
      .from('waitlist_applications')
      .insert(testData);
    
    if (anonError) {
      console.log(`   ❌ INSERT blocked: ${anonError.message}`);
      console.log(`      Error code: ${anonError.code}`);
    } else {
      console.log('   ✅ INSERT allowed');
      // Clean up
      await supabaseAdmin.from('waitlist_applications').delete().eq('email', testData.email);
    }
    
    // 2. Test with service role
    console.log('\n2️⃣  Service role client (admin key):');
    const testData2 = { ...testData, email: `rls-test2-${Date.now()}@example.com` };
    const { error: adminError } = await supabaseAdmin
      .from('waitlist_applications')
      .insert(testData2);
    
    if (adminError) {
      console.log(`   ❌ INSERT blocked: ${adminError.message}`);
    } else {
      console.log('   ✅ INSERT allowed');
      // Clean up
      await supabaseAdmin.from('waitlist_applications').delete().eq('email', testData2.email);
    }
    
    // 3. Check if RLS is enabled
    console.log('\n📋 Checking RLS configuration:\n');
    
    // Try to get table info - this will help understand the state
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*')
      .limit(1);
    
    if (!tableError) {
      console.log('   ✅ Table exists and is accessible via service role');
    } else {
      console.log(`   ❌ Table issue: ${tableError.message}`);
    }
    
    // 4. Test SELECT operations
    console.log('\n📋 Testing SELECT operations:\n');
    
    console.log('1️⃣  Anonymous client:');
    const { data: anonSelect, error: anonSelectError } = await supabaseAnon
      .from('waitlist_applications')
      .select('id')
      .limit(1);
    
    if (anonSelectError) {
      console.log(`   ❌ SELECT blocked: ${anonSelectError.message}`);
    } else {
      console.log(`   ✅ SELECT allowed (found ${anonSelect?.length || 0} rows)`);
    }
    
    console.log('\n2️⃣  Service role client:');
    const { data: adminSelect, error: adminSelectError } = await supabaseAdmin
      .from('waitlist_applications')
      .select('id')
      .limit(1);
    
    if (adminSelectError) {
      console.log(`   ❌ SELECT blocked: ${adminSelectError.message}`);
    } else {
      console.log(`   ✅ SELECT allowed (found ${adminSelect?.length || 0} rows)`);
    }
    
    // Summary and fix
    console.log('\n================================================================================');
    console.log('📊 DIAGNOSIS & FIX');
    console.log('================================================================================\n');
    
    if (anonError && anonError.code === '42501') {
      console.log('❌ RLS is blocking anonymous INSERT operations');
      console.log('\n🔧 TO FIX THIS ISSUE:\n');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run this SQL:\n');
      
      const fixSQL = `-- Fix anonymous waitlist submission
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on waitlist_applications
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', r.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Create simple INSERT policy for anonymous users
CREATE POLICY "allow_anon_insert"
    ON waitlist_applications
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "service_role_all"
    ON waitlist_applications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow admins to view all
CREATE POLICY "admins_select"
    ON waitlist_applications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Grant permissions
GRANT INSERT ON waitlist_applications TO anon;
GRANT ALL ON waitlist_applications TO service_role;`;
      
      console.log(fixSQL);
      console.log('\n3. Click "Run" to execute');
      console.log('4. Test the form again at /waitlist');
    } else if (!anonError) {
      console.log('✅ Anonymous INSERT is working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

checkRLSStatus();