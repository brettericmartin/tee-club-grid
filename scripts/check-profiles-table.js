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

async function checkProfilesTable() {
  console.log('📊 PROFILES TABLE ANALYSIS');
  console.log('='.repeat(50));

  try {
    // Get table structure by selecting all rows and checking columns
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error selecting from profiles:', selectError);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('\n✅ PROFILES TABLE COLUMNS:');
      console.log('-'.repeat(30));
      Object.keys(profiles[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    }

    // Check total count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    console.log(`\n📊 Total profiles: ${count}`);

    // Check for admin users
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('is_admin', true);
    
    if (!adminError) {
      console.log(`\n👨‍💼 Admin users: ${admins?.length || 0}`);
      admins?.forEach(admin => {
        console.log(`  - ${admin.email || admin.id}`);
      });
    }

    // Check beta access users
    const { data: betaUsers, error: betaError } = await supabase
      .from('profiles')
      .select('id, email, beta_access')
      .eq('beta_access', true);
    
    if (!betaError) {
      console.log(`\n🧪 Beta users: ${betaUsers?.length || 0}`);
      betaUsers?.forEach(user => {
        console.log(`  - ${user.email || user.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function checkWaitlistTable() {
  console.log('\n📋 WAITLIST APPLICATIONS TABLE ANALYSIS');
  console.log('='.repeat(50));

  try {
    // Get table structure by selecting all rows and checking columns
    const { data: waitlist, error: selectError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error selecting from waitlist_applications:', selectError);
      return;
    }
    
    if (waitlist && waitlist.length > 0) {
      console.log('\n✅ WAITLIST_APPLICATIONS TABLE COLUMNS:');
      console.log('-'.repeat(30));
      Object.keys(waitlist[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('\n📝 Table exists but no entries found');
    }

    // Check total count
    const { count } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact' });
    console.log(`\n📊 Total waitlist entries: ${count}`);

    // Check approved entries
    const { count: approvedCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact' })
      .eq('beta_access_granted', true);
    console.log(`📊 Approved entries: ${approvedCount || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  await checkProfilesTable();
  await checkWaitlistTable();
}

main().catch(console.error);