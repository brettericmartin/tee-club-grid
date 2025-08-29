#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTableAccess() {
  console.log('🔒 TESTING RLS POLICIES');
  console.log('='.repeat(50));

  const tablesToCheck = [
    'profiles',
    'waitlist_applications',
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'feed_posts',
    'user_follows'
  ];

  for (const tableName of tablesToCheck) {
    console.log(`\n🔍 Testing ${tableName}:`);
    
    try {
      // Test SELECT with service role
      const { data, error, status } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ SELECT error: ${error.message}`);
      } else {
        console.log(`  ✅ SELECT works (${status})`);
      }

      // Test INSERT capability (we won't actually insert, just prepare)
      try {
        const { error: insertError } = await supabase
          .from(tableName)
          .insert({})
          .select();
        
        if (insertError) {
          if (insertError.message.includes('RLS')) {
            console.log(`  🔒 INSERT blocked by RLS`);
          } else if (insertError.message.includes('null value')) {
            console.log(`  ✅ INSERT would work (failed on required fields)`);
          } else {
            console.log(`  ❌ INSERT error: ${insertError.message}`);
          }
        } else {
          console.log(`  ✅ INSERT works`);
        }
      } catch (insertErr) {
        console.log(`  ❓ INSERT test failed: ${insertErr.message}`);
      }

    } catch (err) {
      console.log(`  ❌ Table access failed: ${err.message}`);
    }
  }
}

async function checkFunctions() {
  console.log('\n📋 TESTING DATABASE FUNCTIONS');
  console.log('='.repeat(50));

  const functionsToTest = [
    'is_admin',
    'submit_waitlist_with_profile', 
    'get_user_beta_status',
    'create_profile_for_waitlist'
  ];

  for (const funcName of functionsToTest) {
    try {
      const { data, error } = await supabase.rpc(funcName, {});
      
      if (error) {
        if (error.message.includes('Could not find')) {
          console.log(`  ❌ ${funcName}: Function not found`);
        } else if (error.message.includes('missing argument')) {
          console.log(`  ✅ ${funcName}: Function exists (needs parameters)`);
        } else {
          console.log(`  ❓ ${funcName}: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${funcName}: Function works`);
      }
    } catch (err) {
      console.log(`  ❌ ${funcName}: ${err.message}`);
    }
  }
}

async function main() {
  await testTableAccess();
  await checkFunctions();
}

main().catch(console.error);