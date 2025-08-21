#!/usr/bin/env node
/**
 * Check Database Structure
 * Determines what admin system and columns exist
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStructure() {
  console.log('🔍 Checking Database Structure');
  console.log('================================\n');

  // 1. Check if admins table exists
  console.log('1. Checking for admins table...');
  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('*')
    .limit(1);
  
  const adminsTableExists = !adminsError || !adminsError.message.includes('does not exist');
  if (adminsTableExists) {
    console.log('   ✅ admins table EXISTS');
  } else {
    console.log('   ❌ admins table DOES NOT EXIST');
  }

  // 2. Check profiles table columns
  console.log('\n2. Checking profiles table columns...');
  
  // Check for is_admin column
  const { data: profilesAdmin, error: adminColError } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .limit(1);
  
  if (!adminColError) {
    console.log('   ✅ profiles.is_admin column EXISTS');
  } else if (adminColError.message.includes('column "is_admin" does not exist')) {
    console.log('   ❌ profiles.is_admin column DOES NOT EXIST');
  }

  // Check for deleted_at column
  const { data: profilesDeleted, error: deletedColError } = await supabase
    .from('profiles')
    .select('id, deleted_at')
    .limit(1);
  
  if (!deletedColError) {
    console.log('   ✅ profiles.deleted_at column EXISTS');
  } else if (deletedColError.message.includes('column "deleted_at" does not exist')) {
    console.log('   ❌ profiles.deleted_at column DOES NOT EXIST');
  }

  // 3. Count admin users (if possible)
  console.log('\n3. Admin user counts...');
  
  if (adminsTableExists) {
    const { count } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });
    console.log(`   - Admins in admins table: ${count || 0}`);
  }
  
  if (!adminColError) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);
    console.log(`   - Admins in profiles.is_admin: ${count || 0}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (adminsTableExists) {
    console.log('✅ Using NEW admin system (admins table)');
  } else if (!adminColError) {
    console.log('✅ Using OLD admin system (profiles.is_admin)');
  } else {
    console.log('⚠️  No admin system found!');
  }
  
  if (!deletedColError) {
    console.log('✅ Soft-delete column (deleted_at) exists');
  } else {
    console.log('❌ Soft-delete column (deleted_at) missing');
  }
  
  console.log('\n📝 RECOMMENDATION:');
  if (!adminsTableExists && !adminColError) {
    console.log('Use profiles.is_admin for admin checks (OLD system)');
    console.log('The application code should reference profiles.is_admin');
  } else if (adminsTableExists) {
    console.log('Use admins table for admin checks (NEW system)');
    console.log('The application code should reference admins table');
  }
}

checkStructure().catch(console.error);