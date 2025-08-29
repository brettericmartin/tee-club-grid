#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('================================================================================');
console.log('🚨 CRITICAL FIX: Anonymous Waitlist Submission');
console.log('================================================================================\n');

async function fixWaitlistRLS() {
  try {
    // First, test current state
    console.log('📋 Step 1: Testing current anonymous submission...');
    const testEmail = `test-before-${Date.now()}@example.com`;
    
    // Try with anon client
    const anonClient = createClient(
      supabaseUrl,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { error: anonError } = await anonClient
      .from('waitlist_applications')
      .insert({
        email: testEmail,
        display_name: 'Test User',
        city_region: 'Test City',
        status: 'pending',
        score: 50,
        answers: {}
      });
    
    if (anonError) {
      console.log('   ❌ Anonymous submission blocked (expected)');
      console.log(`   Error: ${anonError.message}\n`);
    } else {
      console.log('   ✅ Anonymous submission already works!\n');
      // Clean up test entry
      await supabase.from('waitlist_applications').delete().eq('email', testEmail);
      return;
    }
    
    // Apply the fix using service role
    console.log('📋 Step 2: Applying RLS fix...');
    
    // SQL to fix the issue
    const fixSQL = `
      -- Drop all existing policies on waitlist_applications
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN 
              SELECT policyname 
              FROM pg_policies 
              WHERE tablename = 'waitlist_applications' 
              AND schemaname = 'public'
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', r.policyname);
          END LOOP;
      END $$;
      
      -- Enable RLS
      ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;
      
      -- Create simple policy for anonymous insert
      CREATE POLICY "allow_anonymous_insert"
          ON waitlist_applications
          FOR INSERT
          TO anon
          WITH CHECK (true);
      
      -- Create policy for service role bypass
      CREATE POLICY "service_role_bypass"
          ON waitlist_applications
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      
      -- Create policy for admins to view all
      CREATE POLICY "admins_can_view_all"
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
      
      -- Grant necessary permissions
      GRANT INSERT ON waitlist_applications TO anon;
      GRANT ALL ON waitlist_applications TO service_role;
    `;
    
    // Execute the fix
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: fixSQL
    }).single();
    
    if (sqlError && !sqlError.message.includes('does not exist')) {
      console.log('   ⚠️  Could not execute SQL via RPC, trying alternative method...');
      
      // Alternative: Direct approach using individual operations
      // Since we can't run raw SQL, we'll document what needs to be done
      console.log('\n📝 Manual Fix Required:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Run the following SQL:\n');
      console.log(fixSQL);
      console.log('\n   3. Click "Run" to execute\n');
    } else {
      console.log('   ✅ RLS policies updated successfully!\n');
    }
    
    // Test the fix
    console.log('📋 Step 3: Testing fix...');
    const testEmail2 = `test-after-${Date.now()}@example.com`;
    
    const { error: testError } = await anonClient
      .from('waitlist_applications')
      .insert({
        email: testEmail2,
        display_name: 'Test User After',
        city_region: 'Test City',
        status: 'pending',
        score: 50,
        answers: {}
      });
    
    if (testError) {
      console.log('   ❌ Fix not applied - manual intervention required');
      console.log(`   Error: ${testError.message}\n`);
      
      console.log('================================================================================');
      console.log('❌ MANUAL FIX REQUIRED\n');
      console.log('Please run the SQL above in your Supabase Dashboard.');
      console.log('This is critical - users cannot sign up until this is fixed!');
      console.log('================================================================================');
    } else {
      console.log('   ✅ Anonymous submission now works!');
      
      // Clean up test entry
      await supabase.from('waitlist_applications').delete().eq('email', testEmail2);
      
      console.log('\n================================================================================');
      console.log('✅ CRITICAL FIX APPLIED SUCCESSFULLY');
      console.log('================================================================================');
      console.log('Anonymous users can now submit waitlist applications!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixWaitlistRLS();