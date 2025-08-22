#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkAdminSetup() {
  console.log('🔍 Checking admin setup...\n');
  
  // Check if admins table exists
  const { data: adminsTable, error: adminsError } = await supabase
    .from('admins')
    .select('*')
    .limit(1);
  
  if (adminsError?.code === '42P01') {
    console.log('❌ admins table does NOT exist');
    console.log('   Will use profiles.is_admin instead\n');
  } else if (adminsError) {
    console.log('⚠️  admins table exists but has error:', adminsError.message);
  } else {
    console.log('✅ admins table exists\n');
  }

  // Check profiles.is_admin column
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .limit(1);
  
  if (!profilesError) {
    console.log('✅ profiles.is_admin column exists');
    if (profilesData && profilesData[0] && 'is_admin' in profilesData[0]) {
      console.log('   Can use profiles.is_admin for admin checks');
    }
  } else {
    console.log('❌ Error checking profiles:', profilesError.message);
  }
}

checkAdminSetup();