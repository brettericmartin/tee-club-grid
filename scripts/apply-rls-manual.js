#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSFixes() {
  console.log('🔐 Applying Critical RLS Fixes...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'fix-rls-critical.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('📄 SQL Content to execute:');
  console.log('='.repeat(50));
  console.log(sqlContent);
  console.log('='.repeat(50));

  console.log('\n🔧 MANUAL EXECUTION REQUIRED:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the SQL above');
  console.log('4. Click "Run" to execute');

  console.log('\n⚠️ This is required because Supabase RPC functions for SQL execution');
  console.log('   are not available in this project setup.');

  // Test if we can at least verify current state
  console.log('\n📊 Attempting to check current RLS status...');

  try {
    // Try to check if RLS is enabled on the tables
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .in('relname', ['feed_likes', 'user_follows']);

    if (!rlsError && rlsStatus) {
      console.log('\n📋 Current RLS Status:');
      rlsStatus.forEach(table => {
        console.log(`  ${table.relname}: ${table.relrowsecurity ? '✅ Enabled' : '❌ Disabled'}`);
      });
    } else {
      console.log('❌ Could not check RLS status');
    }

    // Try to check existing policies
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .in('tablename', ['feed_likes', 'user_follows']);

    if (!policyError && policies && policies.length > 0) {
      console.log('\n📋 Existing Policies:');
      policies.forEach(policy => {
        console.log(`  ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('\n📋 No existing policies found (or unable to check)');
    }

  } catch (error) {
    console.log('⚠️ Could not verify current database state:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Execute the SQL above in Supabase Dashboard');
  console.log('2. Verify no errors occur during execution');
  console.log('3. Test that likes/follows functionality works correctly');
  console.log('4. Confirm RLS is protecting user data appropriately');

  console.log('\n✅ RLS Fix Script Completed!');
  console.log('   Manual execution required in Supabase Dashboard');
}

applyRLSFixes().catch(console.error);