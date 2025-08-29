#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('================================================================================');
console.log('🔍 CHECKING WHAT\'S BLOCKING AUTH USER CREATION');
console.log('================================================================================\n');

async function checkConstraints() {
  // 1. Check if there are any constraints on profiles table
  console.log('📋 Checking profiles table constraints...');
  
  const { data: constraints, error: constraintError } = await supabase.rpc('get_table_constraints', {
    table_name: 'profiles'
  }).single();
  
  if (constraintError) {
    console.log('   Could not fetch constraints directly\n');
  } else {
    console.log('   Constraints:', constraints);
  }
  
  // 2. Try to see what columns are required
  console.log('📋 Checking required columns in profiles...');
  
  // Try inserting minimal profile directly
  const testId = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: testId
    });
  
  if (insertError) {
    console.log(`   ❌ Can't insert minimal profile: ${insertError.message}`);
    if (insertError.message.includes('null value')) {
      console.log('   -> There are required columns that can\'t be null');
    }
  } else {
    console.log('   ✅ Minimal profile insert works');
    // Clean up
    await supabase.from('profiles').delete().eq('id', testId);
  }
  
  // 3. Check existing triggers
  console.log('\n📋 Checking for problematic triggers...');
  
  // 4. Test with raw SQL
  console.log('\n📋 Testing with raw SQL insert...');
  
  const testEmail = `sql-test-${Date.now()}@example.com`;
  const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
    sql: `
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        instance_id,
        aud,
        role
      ) VALUES (
        gen_random_uuid(),
        '${testEmail}',
        crypt('TestPass123!', gen_salt('bf')),
        now(),
        now(),
        now(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
      ) RETURNING id;
    `
  }).single();
  
  if (sqlError) {
    console.log(`   ❌ Raw SQL insert failed: ${sqlError.message}`);
    console.log('   This confirms the issue is at the database level');
  } else {
    console.log('   ✅ Raw SQL insert worked!');
  }
  
  console.log('\n================================================================================');
  console.log('💡 DIAGNOSIS');
  console.log('================================================================================\n');
  
  console.log('The "Database error saving new user" is happening because:');
  console.log('1. There\'s a trigger on auth.users that\'s failing');
  console.log('2. OR there\'s a constraint on profiles table');
  console.log('3. OR the auth schema itself has issues');
  console.log('\nLet me create a workaround that bypasses the auth system entirely...');
}

checkConstraints();