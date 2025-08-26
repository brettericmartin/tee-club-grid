import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBetaTables() {
  console.log('🔍 CHECKING BETA SYSTEM TABLES\n');
  console.log('=' .repeat(80));
  
  const betaTables = [
    'feature_flags',
    'waitlist_applications', 
    'invite_codes',
    'referral_chains'
  ];
  
  console.log('\n📊 BETA-SPECIFIC TABLES:\n');
  
  for (const table of betaTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} records`);
        
        // Get sample to check columns
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}\n`);
        } else {
          console.log(`   Table exists but is empty\n`);
        }
      } else {
        console.log(`❌ ${table}: ${error.message}\n`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}\n`);
    }
  }
  
  // Check profiles table for beta columns
  console.log('\n📊 CHECKING BETA-RELATED COLUMNS IN PROFILES TABLE\n');
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (profile) {
      const betaColumns = [
        'beta_access',
        'referred_by_user_id',
        'referral_code',
        'referral_code_uses',
        'invite_quota',
        'invites_sent',
        'waitlist_application_id',
        'deleted_at'
      ];
      
      for (const col of betaColumns) {
        if (col in profile) {
          console.log(`✅ profiles.${col} exists`);
        } else {
          console.log(`❌ profiles.${col} missing`);
        }
      }
    }
  } catch (err) {
    console.log(`❌ Could not check profiles columns: ${err.message}`);
  }
  
  // Check feature flags
  console.log('\n🚩 CHECKING FEATURE FLAGS CONFIGURATION\n');
  
  try {
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('*');
    
    if (flags && flags.length > 0) {
      for (const flag of flags) {
        console.log(`Flag: ${flag.flag_name}`);
        console.log(`  Value: ${flag.flag_value}`);
        console.log(`  Updated: ${flag.updated_at}\n`);
      }
    } else {
      console.log('❌ No feature flags configured yet - need to initialize');
    }
  } catch (err) {
    console.log(`❌ Could not fetch feature flags: ${err.message}`);
  }
  
  // Check waitlist applications
  console.log('\n📝 CHECKING WAITLIST APPLICATIONS\n');
  
  try {
    const { data: apps, count } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (apps && apps.length > 0) {
      console.log(`Total applications: ${count}`);
      console.log('\nRecent applications:');
      for (const app of apps) {
        console.log(`  - ${app.email} (${app.status}) - Score: ${app.score}`);
      }
    } else {
      console.log('No waitlist applications yet');
    }
  } catch (err) {
    console.log(`Could not fetch waitlist applications: ${err.message}`);
  }
  
  // Check users with beta access
  console.log('\n👥 CHECKING USERS WITH BETA ACCESS\n');
  
  try {
    const { data: betaUsers, count } = await supabase
      .from('profiles')
      .select('username, display_name, beta_access, created_at', { count: 'exact' })
      .eq('beta_access', true);
    
    if (betaUsers && betaUsers.length > 0) {
      console.log(`Users with beta access: ${count}`);
      for (const user of betaUsers) {
        console.log(`  - ${user.username || user.display_name} (joined: ${user.created_at})`);
      }
    } else {
      console.log('No users have beta access yet');
    }
  } catch (err) {
    console.log(`Could not fetch beta users: ${err.message}`);
  }
  
  // Summary
  console.log('\n📊 BETA SYSTEM SUMMARY\n');
  console.log('=' .repeat(80));
  
  const issues = [];
  
  // Check for missing tables
  for (const table of betaTables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      issues.push(`Missing table: ${table}`);
    }
  }
  
  // Check for missing columns
  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  if (profileSample) {
    if (!('beta_access' in profileSample)) {
      issues.push('Missing profiles.beta_access column');
    }
    if (!('referral_code' in profileSample)) {
      issues.push('Missing profiles.referral_code column');
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ Beta system schema appears to be fully configured!');
  } else {
    console.log('❌ Issues found:');
    for (const issue of issues) {
      console.log(`   - ${issue}`);
    }
    console.log('\n💡 Run the migration scripts to fix these issues');
  }
}

checkBetaTables()
  .then(() => {
    console.log('\n✨ Beta system check complete!');
  })
  .catch(error => {
    console.error('\n❌ Beta system check failed:', error);
  });